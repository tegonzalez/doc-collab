import { NextResponse } from 'next/server';
import { queueManager } from '@/lib/queue/manager'; 
import { randomUUID } from 'node:crypto';
import { constants as fsConstants, createWriteStream } from 'node:fs'; // Import createWriteStream directly
import fsPromises from 'node:fs/promises'; // Keep fsPromises for promise-based functions
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream'; 

// Define the staging directory 
const STAGING_DIR = '/tmp/collabflow-uploads';

// Helper function to ensure the staging directory exists
async function ensureStagingDir(): Promise<void> {
  try {
    // Use fsPromises for access/mkdir
    await fsPromises.access(STAGING_DIR, fsConstants.W_OK);
  } catch (error: unknown) { // Use unknown type
    // Check if error is a Node.js filesystem error with a 'code' property
    let errorCode: string | undefined;
    if (typeof error === 'object' && error !== null && 'code' in error) {
      errorCode = (error as NodeJS.ErrnoException).code;
    }

    if (errorCode === 'ENOENT') {
      try {
        await fsPromises.mkdir(STAGING_DIR, { recursive: true });
        console.log('Created staging directory: ' + STAGING_DIR);
      } catch (mkdirError: unknown) {
        let mkdirErrorMessage = 'Unknown error creating directory';
        if (mkdirError instanceof Error) {
            mkdirErrorMessage = mkdirError.message;
        }
        console.error('Failed to create staging directory ' + STAGING_DIR + ':', mkdirErrorMessage);
        throw new Error('Failed to create staging directory: ' + STAGING_DIR);
      }
    } else {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Staging directory ' + STAGING_DIR + ' is not writable:', errorMessage);
      throw new Error('Staging directory ' + STAGING_DIR + ' is not writable.');
    }
  }
}

export async function POST(request: Request) {
  const userIdHeader = request.headers.get('x-user-id');

  if (!userIdHeader) {
    console.error('Upload API: Missing x-user-id header');
    return NextResponse.json({ error: 'Unauthorized - Missing user ID' }, { status: 401 });
  }

  const userId = parseInt(userIdHeader, 10);
  if (isNaN(userId)) {
      console.error('Upload API: Invalid x-user-id header format');
      return NextResponse.json({ error: 'Unauthorized - Invalid user ID format' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const projectId = formData.get('projectId') as string | null; 

  if (!file?.stream) { 
     return NextResponse.json({ error: 'Invalid or no file stream provided' }, { status: 400 });
  }

  if (!projectId) {
      return NextResponse.json({ error: 'No project ID provided' }, { status: 400 });
  }

  let tempFilePath: string | null = null; 

  try {
    await ensureStagingDir();

    const tempFilename = randomUUID();
    tempFilePath = path.join(STAGING_DIR, tempFilename);

    const fileStream = file.stream() as unknown as Readable;
    const destinationStream = createWriteStream(tempFilePath);
    
    await pipeline(
       fileStream,
       destinationStream
    );

    console.log('File streamed successfully to ' + tempFilePath);

    const taskId = queueManager.addTask('PROCESS_UPLOADED_ASSET', {
      userId: userId, 
      projectId,
      originalFilename: file.name,
      mimeType: file.type,
      size: file.size,
      tempFilePath: tempFilePath, 
    });

    return NextResponse.json({ message: 'Upload accepted for processing', taskId }, { status: 202 });

  } catch (error: unknown) { // Use unknown type
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Upload processing failed in API handler:', errorMessage);
    
    if (tempFilePath) {
        try {
            await fsPromises.unlink(tempFilePath);
            console.log('Cleaned up temp file after API handler error: ' + tempFilePath);
        } catch (cleanupError: unknown) {
            const cleanupMessage = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
            console.error('Failed to cleanup temp file after API handler error:', cleanupMessage);
        }
    }
    return NextResponse.json({ error: 'Failed to process upload request' }, { status: 500 });
  }
}
