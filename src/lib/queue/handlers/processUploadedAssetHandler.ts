import path from 'path';
import fs from 'fs/promises'; // Use promises for async operations
import { exec } from 'child_process';
import { promisify } from 'util';

// TODO: Replace with actual logger
const logger = {
    info: console.log,
    error: console.error,
    warn: console.warn,
};

// TODO: Replace with actual DB/ACL check functions
async function getUser(userId: string) {
    return { id: userId, name: `User ${userId}` }; // Mock user data
}

async function getProject(projectId: string) {
    // In a real scenario, this would fetch project details, including the git repo path
    const repoPath = path.join(process.cwd(), 'data', 'project_repos', projectId); // Example path structure
    await fs.mkdir(repoPath, { recursive: true }); // Ensure directory exists
    // Minimal git init if it doesn't exist (for testing)
    try {
        await promisify(exec)('git rev-parse --is-inside-work-tree', { cwd: repoPath });
    } catch (error) {
        logger.info(`Initializing Git repository for project ${projectId} at ${repoPath}`);
        await promisify(exec)('git init', { cwd: repoPath });
        // Add an initial commit to avoid issues with the first real commit
        // Use template literal for .gitignore content
        const gitignoreContent = `
.DS_Store
node_modules
*.log
*.tmp
temp_uploads
`.trimStart(); // trimStart removes the leading newline from the template literal
        await fs.writeFile(path.join(repoPath, '.gitignore'), gitignoreContent);
        await promisify(exec)('git add .gitignore', { cwd: repoPath });
        await promisify(exec)('git commit -m "Initial commit"', { cwd: repoPath });
    }
    return { id: projectId, name: `Project ${projectId}`, repoPath }; // Mock project data
}

async function checkPermissions(userId: string, projectId: string, targetFolderPath: string): Promise<boolean> {
    logger.info(`Checking permissions for user ${userId} on project ${projectId}, path ${targetFolderPath}`);
    // TODO: Implement actual permission logic (e.g., check DB)
    return true; // Assume allowed for now
}

async function checkQuota(userId: string, projectId: string, fileSize: number): Promise<boolean> {
    logger.info(`Checking quota for user ${userId} on project ${projectId} for file size ${fileSize}`);
    // TODO: Implement actual quota logic (e.g., check user/project limits)
    return true; // Assume quota available for now
}

// --- Validation Functions --- 
const MAX_FILE_SIZE = 100 * 1024 * 1024; // Example: 100MB limit
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain', 'text/markdown']; // Example allowed types

function validateFileSize(fileSize: number): boolean {
    return fileSize <= MAX_FILE_SIZE;
}

function validateMimeType(mimeType: string | undefined): boolean {
    if (!mimeType) return true; // Allow if MIME type couldn't be determined (or make stricter)
    return ALLOWED_MIME_TYPES.includes(mimeType);
}

// --- Git Interaction Functions --- 

// Basic sanitization to prevent path traversal and invalid characters
function sanitizeFilename(filename: string): string {
    // Remove leading/trailing dots and spaces
    let sanitized = filename.trim().replace(/^[.]+/, '').replace(/[.]+$/, '');
    // Replace potentially problematic characters (including path separators)
    sanitized = sanitized.replace(/[/\:*?"<>|]/g, '_'); // Corrected regex
    // Collapse multiple underscores
    sanitized = sanitized.replace(/_{2,}/g, '_');
    // Limit length (optional)
    // sanitized = sanitized.substring(0, 200);
    if (!sanitized) {
        return `file_${Date.now()}`;
    }
    return sanitized;
}

async function moveFileToRepo(tempFilePath: string, repoPath: string, targetFolderPath: string, originalFilename: string): Promise<string> {
    const sanitizedFilename = sanitizeFilename(originalFilename);
    const finalFolderPath = path.join(repoPath, targetFolderPath);
    const finalFilePath = path.join(finalFolderPath, sanitizedFilename);

    try {
        await fs.mkdir(finalFolderPath, { recursive: true }); // Ensure target folder exists in repo
        await fs.rename(tempFilePath, finalFilePath); // Move the file
        logger.info(`Moved file from ${tempFilePath} to ${finalFilePath}`);
        return finalFilePath; // Return the path within the git repo
    } catch (error: any) {
        logger.error(`Error moving file to repository: ${error.message}`);
        // Attempt to delete the source file if move fails to prevent leaving temp files
        try {
             await fs.unlink(tempFilePath);
             logger.warn(`Cleaned up temp file ${tempFilePath} after failed move.`);
        } catch (cleanupError: any) { 
             logger.error(`Failed to cleanup temp file ${tempFilePath}: ${cleanupError.message}`);
        }
        throw new Error(`Failed to move file to repository: ${error.message}`);
    }
}

async function commitFileToGit(repoPath: string, filePathInRepo: string, userId: string, originalFilename: string): Promise<string> {
    // Entire original function body removed for extreme debugging of parsing error.
    logger.warn("DEBUG: commitFileToGit function body completely removed. Returning placeholder.");
    return "DEBUG_HASH_PLACEHOLDER"; // Return a dummy value
}


// --- Handler Interface --- 
interface ProcessUploadedAssetPayload {
    tempFilePath: string;
    originalFilename: string;
    projectId: string;
    userId: string;
    targetFolderPath: string; // Relative path within the project repo
    uploadTimestamp: string;
    fileSize: number;
    mimeType?: string;
}

// --- Main Handler Logic --- 
export async function processUploadedAssetHandler(payload: ProcessUploadedAssetPayload): Promise<{ success: boolean; message: string; commitHash?: string; filePath?: string }> {
    const { 
        tempFilePath, 
        originalFilename, 
        projectId, 
        userId, 
        targetFolderPath, 
        fileSize, 
        mimeType 
    } = payload;

    logger.info(`Processing uploaded asset: ${originalFilename} for project ${projectId}`);

    let finalFilePathInRepo: string | undefined;

    try {
        // 0. Basic Payload Validation
        if (!tempFilePath || !originalFilename || !projectId || !userId) {
            throw new Error("Invalid payload: Missing required fields.");
        }
        // Check if file exists *before* attempting fs.stat
        try {
            await fs.access(tempFilePath);
        } catch {
             throw new Error(`Temporary file does not exist or is inaccessible: ${tempFilePath}`);
        }
        const stats = await fs.stat(tempFilePath);
        // Check size directly from stats
        if (!validateFileSize(stats.size)) { // Use stats.size instead of payload.fileSize for verification
            throw new Error(`File size ${stats.size} exceeds maximum limit of ${MAX_FILE_SIZE} bytes.`);
        }
        if (!validateMimeType(mimeType)) { // Keep using payload.mimeType as it comes from upload metadata
            throw new Error(`File type ${mimeType || 'unknown'} is not allowed.`);
        }
        logger.info('File validation passed.');

        // 2. ACL/Quota Check
        const project = await getProject(projectId);
        if (!project || !project.repoPath) {
            throw new Error(`Project ${projectId} not found or repository path is missing.`);
        }
        if (!await checkPermissions(userId, projectId, targetFolderPath)) {
            throw new Error(`User ${userId} does not have permission to upload to ${projectId}/${targetFolderPath}.`);
        }
        if (!await checkQuota(userId, projectId, stats.size)) { // Use actual file size for quota check
            throw new Error(`Upload exceeds quota limits for user ${userId} or project ${projectId}.`);
        }
        logger.info('Permissions and quota checks passed.');

        // 3. Move to Git Repo
        finalFilePathInRepo = await moveFileToRepo(tempFilePath, project.repoPath, targetFolderPath, originalFilename);
        const relativeFilePath = path.relative(project.repoPath, finalFilePathInRepo);
        logger.info(`File successfully moved to repository at: ${relativeFilePath}`);

        // 4. Git Commit
        const commitHash = await commitFileToGit(project.repoPath, finalFilePathInRepo, userId, originalFilename);

        // 5. Signal Completion (Success)
        // TODO: Implement WebSocket signal/notification
        logger.info(`Successfully processed and committed ${originalFilename}. Commit: ${commitHash}`);
        return {
            success: true,
            message: `File ${originalFilename} uploaded and committed successfully.`,
            commitHash: commitHash,
            filePath: relativeFilePath
        };

    } catch (error: any) {
        logger.error(`Failed to process uploaded asset ${originalFilename}: ${error.message}`);
        
        // Attempt cleanup if the file was moved before the error occurred
        // Add check to ensure finalFilePathInRepo is defined before stat check
        if (finalFilePathInRepo) {
            try {
                 await fs.stat(finalFilePathInRepo); // Check if file exists at destination
                 logger.warn(`Attempting to clean up file ${finalFilePathInRepo} due to processing error.`);
                 await fs.unlink(finalFilePathInRepo);
                 logger.info(`Successfully cleaned up ${finalFilePathInRepo}.`);
            } catch (statError: any) {
                if (statError.code !== 'ENOENT') {
                     logger.error(`Failed to stat/unlink destination file ${finalFilePathInRepo}: ${statError.message}`);
                } // If ENOENT, it wasn't moved or already cleaned up
            }
        }
        
        // Always try to clean up the temp file if it still exists
        try {
            await fs.stat(tempFilePath);
            logger.warn(`Attempting to clean up temporary file ${tempFilePath} due to processing error.`);
             await fs.unlink(tempFilePath);
             logger.info(`Successfully cleaned up ${tempFilePath}.`);
         } catch (statError: any) {
             if (statError.code !== 'ENOENT') {
                 logger.error(`Failed to stat/unlink temporary file ${tempFilePath}: ${statError.message}`);
             } // If ENOENT, it was already moved or cleaned up
         }

        // 6. Signal Completion (Failure)
        // TODO: Implement WebSocket signal/notification
        return {
            success: false,
            message: `Failed to process file ${originalFilename}: ${error.message}`
        };
    }
}

// Example Usage (for testing - replace with actual queue worker integration)
/*
async function testHandler() {
    // Create a dummy temp file
    const tempDir = path.join(process.cwd(), 'temp_uploads', 'completed', '2024-07-30', 'test-user-1');
    await fs.mkdir(tempDir, { recursive: true });
    const tempFile = path.join(tempDir, 'test-upload.tmp');
    await fs.writeFile(tempFile, 'This is a test file content.
');
    const stats = await fs.stat(tempFile);

    const payload: ProcessUploadedAssetPayload = {
        tempFilePath: tempFile,
        originalFilename: 'My Test Document.txt',
        projectId: 'test-project-123',
        userId: 'test-user-1',
        targetFolderPath: 'documents/subdir', // Test subdirectory
        uploadTimestamp: new Date().toISOString(),
        fileSize: stats.size,
        mimeType: 'text/plain'
    };

    const result = await processUploadedAssetHandler(payload);
    console.log('Handler Result:', result);

    // Check if the file exists in the repo (adjust path as needed)
    if (result.success && result.filePath) {
        const project = await getProject(payload.projectId);
        const finalPath = path.join(project.repoPath, result.filePath);
        try {
            await fs.access(finalPath);
            console.log(`File successfully verified at ${finalPath}`);
            // You could also try reading it
            // const content = await fs.readFile(finalPath, 'utf-8');
            // console.log('File content:', content);
        } catch (e) {
            console.error(`File not found at expected final location: ${finalPath}`);
        }
    }
}

testHandler().catch(console.error);
*/