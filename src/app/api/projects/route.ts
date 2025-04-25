import { NextRequest, NextResponse } from 'next/server';
import { queueManager } from '@/lib/queue/manager'; // Assuming queueManager is correctly exported
// We'll need crypto for hashing and UUIDs
import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';

// Function to generate a filesystem-safe hash
// Using SHA-256 and encoding as hex
function generateRepoHash(userId: string | number, projectId: string): string {
  const hash = createHash('sha256');
  hash.update(`${userId}-${projectId}`);
  return hash.digest('hex');
}

// GET /api/projects - List projects (remains the same)
export async function GET() {
  try {
    // Placeholder implementation that would retrieve projects from storage
    // In reality, this should come from walking the git repos or the in-memory cache
    const projects = [
      { id: 'project-1', name: 'Sample Project', createdAt: new Date().toISOString() }
    ];

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error listing projects:', error);
    return NextResponse.json(
      { error: 'Failed to list projects' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    // 1. Extract project name from request body
    const body = await request.json();
    const projectName = body.name;

    // 2. Validate project name
    if (!projectName || typeof projectName !== 'string' || projectName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Project name is required and must be a non-empty string.' },
        { status: 400 }
      );
    }
    // Add more validation as needed (e.g., length, allowed characters)

    // 3. Get userId from request headers (added by middleware)
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      console.error('User ID not found in request headers.');
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }
     // Ensure userId is consistently treated, parse if necessary depending on how it's stored/passed
    const parsedUserId = parseInt(userId, 10);
     if (isNaN(parsedUserId)) {
       console.error('Invalid User ID format in request headers:', userId);
       return NextResponse.json({ error: 'Invalid user authentication.' }, { status: 400 });
     }


    // 4. Generate a unique projectId
    const projectId = randomUUID();

    // 5. Generate the repository hash
    const repoHash = generateRepoHash(parsedUserId, projectId);
    const repoPath = `/app/projects/${repoHash}.git`; // Path for the bare repo

    // 6. Create the manifest data
    const manifestData = {
      userId: parsedUserId,
      projectId: projectId,
      projectName: projectName.trim(), // Use trimmed name
      createdAt: new Date().toISOString(),
      // Add schema version?
      schemaVersion: 1
    };

    // 7. Enqueue the task to create the Git repository and add the manifest
    // The task payload includes all necessary info for the task handler
    const taskPayload = {
      userId: parsedUserId,
      projectId: projectId,
      projectName: manifestData.projectName,
      repoHash: repoHash,
      repoPath: repoPath, // Pass the full path for clarity in the task handler
      manifestContent: JSON.stringify(manifestData, null, 2) // Pass the content directly
    };

    // Use a descriptive task type
    const taskId = queueManager.addTask('CREATE_GIT_REPO_WITH_MANIFEST', taskPayload);

    console.log(`Enqueued task ${taskId} to create project '${manifestData.projectName}' (ID: ${projectId}) at ${repoPath}`);

    // 8. Return task ID and pending status
    return NextResponse.json({
      taskId: taskId,
      projectId: projectId, // Return the new project ID
      projectName: manifestData.projectName,
      status: 'queued',
      message: `Project '${manifestData.projectName}' creation initiated. Task ID: ${taskId}`
    }, { status: 202 }); // 202 Accepted: request accepted, processing not complete

  } catch (error) {
    console.error('Error creating project:', error);
    // Check for JSON parsing errors specifically
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to initiate project creation.' },
      { status: 500 }
    );
  }
}
