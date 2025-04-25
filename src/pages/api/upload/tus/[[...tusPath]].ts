import { NextApiRequest, NextApiResponse } from 'next';
import { FileStore } from '@tus/file-store';
// Remove unused Upload and Request imports
import { Server, EVENTS } from '@tus/server'; 
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import os from 'os';

// TODO: Replace with actual queue manager import
const enqueueTask = async (taskType: string, payload: any) => {
    console.log(`[Mock Queue] Enqueuing task: ${taskType}`, payload);
    // Simulate background processing delay
    await new Promise(resolve => setTimeout(resolve, 2000)); 
    console.log(`[Mock Queue] Task ${taskType} with temp file ${payload.tempFilePath} supposedly processed.`);
    // TODO: Implement actual queue logic (e.g., BullMQ, RabbitMQ)
    // TODO: Implement WebSocket signaling on completion/failure
};

// --- Configuration --- 
// Ensure temporary directories exist
const baseTempDir = path.join(process.cwd(), 'temp_uploads');
const tusFilesDir = path.join(baseTempDir, 'tus_files'); // For tus state and chunks
const completedUploadsDir = path.join(baseTempDir, 'completed'); // For assembled files

fs.mkdirSync(tusFilesDir, { recursive: true });
fs.mkdirSync(completedUploadsDir, { recursive: true });

const tusStore = new FileStore({ directory: tusFilesDir });

// Corrected instantiation name
const tusServer = new Server({ 
    path: '/api/upload/tus', // Base path for Tus endpoint
    datastore: tusStore,
    // Naming function to control how files are stored temporarily by tus-node-server
    // This helps keep track of the original filename *before* EVENT_UPLOAD_COMPLETE
    // Remove type annotation for req
    namingFunction: (req) => { 
        const metadata = req.headers['upload-metadata'];
        let originalFilename = 'unknown_file';
        if (typeof metadata === 'string') {
            const parsedMeta = metadata.split(',').reduce((acc, pair) => {
                const [key, value] = pair.split(' ');
                if (key && value) {
                    acc[key] = Buffer.from(value, 'base64').toString('utf-8');
                }
                return acc;
            }, {} as Record<string, string>);
            originalFilename = parsedMeta.filename || originalFilename;
        }        
        // Use a UUID for the internal Tus ID to avoid collisions
        return `${randomUUID()}__${Buffer.from(originalFilename).toString('base64url')}`;
    },
    // Hook executed *before* creating the upload resource
    // Remove type annotations for req and upload
    onUploadCreate: async (req, upload) => { 
        console.log('[TusServer] EVENT_UPLOAD_CREATE triggered');
        // TODO: Implement real authentication/authorization
        // const { userId } = await getUserIdFromRequest(req); // Replace with actual auth logic
        const userId = 1; // Placeholder User ID

        const metadataHeader = req.headers['upload-metadata'] as string | undefined;
        if (!metadataHeader) {
            console.error('[TusServer] Missing Upload-Metadata header');
            throw { status_code: 400, body: 'Missing Upload-Metadata header' };
        }

        // Extract metadata sent from Uppy client (projectId, targetFolderPath, etc.)
        const metadata = metadataHeader.split(',').reduce((acc, pair) => {
            const [key, value] = pair.split(' ');
            if (key && value) {
                acc[key] = Buffer.from(value, 'base64').toString('utf-8');
            }
            return acc;
        }, {} as Record<string, string>); 

        const projectId = metadata.projectId;
        const targetFolderPath = metadata.targetFolderPath || '.'; // Default to root if not provided
        const originalFilename = metadata.filename || 'unnamed_file'; // Ensure filename is captured

        if (!projectId) {
             console.error('[TusServer] Missing projectId in metadata');
            throw { status_code: 400, body: 'Missing projectId in metadata' };
        }

        console.log(`[TusServer] Upload requested for Project ID: ${projectId}, Target Path: ${targetFolderPath}, Filename: ${originalFilename}, User ID: ${userId}`);

        // TODO: Add ACL/Quota checks here if possible (early failure)
        // const hasPermission = await checkPermissions(userId, projectId, targetFolderPath);
        // if (!hasPermission) { throw { status_code: 403, body: 'Permission denied' }; }

        // Store extracted metadata within the Tus upload object for later use in EVENT_UPLOAD_COMPLETE
        // Assign directly to upload.metadata
        upload.metadata = {
            ...upload.metadata, // Keep existing Tus metadata
            userId: String(userId),
            projectId: projectId,
            targetFolderPath: targetFolderPath,
            originalFilename: originalFilename, // Store original filename consistently
        };

        console.log('[TusServer] Metadata attached to upload:', upload.metadata);

        // Explicitly return empty object to satisfy expected Promise type
        return {}; 
    },
    // Hook executed *after* the entire file is uploaded and assembled
    // Remove type annotations for req and upload
    onUploadFinish: async (req, upload) => {
        console.log('[TusServer] EVENT_UPLOAD_COMPLETE triggered for Tus ID:', upload.id);
        console.log('[TusServer] Completed Upload Metadata:', upload.metadata);

        const userId = upload.metadata?.userId || 'unknown_user';
        const projectId = upload.metadata?.projectId || 'unknown_project';
        const targetFolderPath = upload.metadata?.targetFolderPath || '.';
        const originalFilename = upload.metadata?.originalFilename || 'unknown_file';
        const fileSize = upload.size;
        const mimeType = upload.metadata?.filetype; // Uppy usually sends filetype
        
        // 1. Define temporary path for the *completed* upload
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const userTempDir = path.join(completedUploadsDir, date, String(userId));
        fs.mkdirSync(userTempDir, { recursive: true });
        const tempFileName = `${randomUUID()}.tmp`; // Use UUID for the temp file name
        const tempFilePath = path.join(userTempDir, tempFileName);

        try {
            // 2. Move the fully assembled file from tus's internal storage to our temp location
            //    The file is located at `tusStore.directory + '/' + upload.id`
            const sourcePath = path.join(tusFilesDir, upload.id);
            if (!fs.existsSync(sourcePath)) {
                console.error(`[TusServer] CRITICAL: Assembled file not found at ${sourcePath} for upload ${upload.id}`);
                throw { status_code: 500, body: `Internal server error: Uploaded file fragment missing.` };
            }
            fs.renameSync(sourcePath, tempFilePath);
            console.log(`[TusServer] Moved completed file from ${sourcePath} to ${tempFilePath}`);
            
            // Delete the .info file associated with the upload in the tus store
            const infoFilePath = path.join(tusFilesDir, `${upload.id}.info`);
            if (fs.existsSync(infoFilePath)) {
                fs.unlinkSync(infoFilePath);
                console.log(`[TusServer] Cleaned up Tus info file: ${infoFilePath}`);
            } else {
                console.warn(`[TusServer] Tus info file not found for cleanup: ${infoFilePath}`);
            }

            // 3. Enqueue background task
            const taskPayload = {
                tempFilePath: tempFilePath,
                originalFilename: originalFilename,
                projectId: projectId,
                userId: userId,
                targetFolderPath: targetFolderPath,
                uploadTimestamp: new Date().toISOString(),
                fileSize: fileSize,
                mimeType: mimeType,
            };
            await enqueueTask('PROCESS_UPLOADED_ASSET', taskPayload);
            console.log(`[TusServer] Enqueued PROCESS_UPLOADED_ASSET task for ${originalFilename}`);

            // Explicitly return empty object to satisfy expected Promise type
            return {}; 
        
        } catch (error: any) { // Catch as any to access properties
            console.error(`[TusServer] Error during EVENT_UPLOAD_COMPLETE for ${upload.id}:`, error);
            // Attempt to clean up the moved file if an error occurred *after* moving
            if (fs.existsSync(tempFilePath)) {
                try {
                    fs.unlinkSync(tempFilePath);
                    console.log(`[TusServer] Cleaned up temporary file ${tempFilePath} due to error.`);
                } catch (cleanupError: any) { // Catch as any
                    console.error(`[TusServer] Failed to cleanup temporary file ${tempFilePath}:`, cleanupError);
                }
            }
            // Re-throw error to TusServer to send appropriate HTTP error response
            if (error.status_code) {
                 throw error; // Throw errors with status_code directly
            } else {
                throw { status_code: 500, body: `Internal server error during upload finalization: ${error.message || 'Unknown error'}` };
            }
        }
    }
});

// --- API Handler --- 
// Route all methods for the specific API path to the Tus server
export default function handler(req: NextApiRequest, res: NextApiResponse) {
    // Ensure the request URL path matches the Tus server base path 
    // This prevents Server from handling other API routes under /api/upload/
    if (!req.url?.startsWith(tusServer.options.path)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
    }
    
    return tusServer.handle(req, res);
}

// Required for Next.js API routes with external libraries managing the response
export const config = {
    api: {
        bodyParser: false,
    },
};
