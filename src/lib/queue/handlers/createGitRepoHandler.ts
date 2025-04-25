import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

interface CreateGitRepoPayload {
    userId: string;
    projectId: string;
    projectName: string;
    repoHash: string; 
    repoPath: string; 
    manifestContent: string;
}

// Helper to safely get error messages
const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    return String(error);
};

export async function handleCreateGitRepoWithManifest(payload: CreateGitRepoPayload): Promise<{ success: boolean; message: string; repoPath?: string }> {
    const { repoPath, manifestContent, projectName } = payload;
    let tempDir: string | undefined;

    console.log('[Task Handler] Starting CREATE_GIT_REPO_WITH_MANIFEST for project: ' + projectName + ' at ' + repoPath);

    try {
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'temp-repo-'));
        console.log('[Task Handler] Created temporary directory: ' + tempDir);

        await execAsync('git init', { cwd: tempDir });
        console.log('[Task Handler] Initialized standard repo in temp directory.');

        const manifestPath = path.join(tempDir, 'manifest.json');
        await fs.writeFile(manifestPath, manifestContent);
        console.log('[Task Handler] Wrote manifest.json to temp directory.');

        await execAsync('git config user.email "automation@example.com"', { cwd: tempDir });
        await execAsync('git config user.name "Automation Script"', { cwd: tempDir });

        await execAsync('git add manifest.json', { cwd: tempDir });
        await execAsync('git commit -m "Initial commit: Add manifest.json"', { cwd: tempDir });
        console.log('[Task Handler] Committed manifest.json in temp repo.');

        const parentDir = path.dirname(repoPath);
        await fs.mkdir(parentDir, { recursive: true });
        await execAsync('git init --bare ' + repoPath); // Avoid template literal just in case
        console.log('[Task Handler] Initialized bare repository at: ' + repoPath);

        const hooksDir = path.join(repoPath, 'hooks');
        const scriptsDir = process.env.SCRIPTS_DIR || '/app/docker'; 
        const preReceiveHookSource = path.join(scriptsDir, 'git-pre-receive-hook.sh');
        const preReceiveHookDest = path.join(hooksDir, 'pre-receive');

        try {
            await fs.symlink(preReceiveHookSource, preReceiveHookDest, 'file');
            await fs.chmod(preReceiveHookDest, '755'); 
            console.log('[Task Handler] Linked pre-receive hook for ' + repoPath);
        } catch (linkError: unknown) {
             const linkErrorMessage = getErrorMessage(linkError);
             console.error('[Task Handler] Failed to link pre-receive hook for ' + repoPath + ': ' + linkErrorMessage);
             // Consider if this is critical
        }

        await execAsync('git remote add origin ' + repoPath, { cwd: tempDir }); // Avoid template literal
        
        let defaultBranch = 'main';
        try {
            const { stdout } = await execAsync('git symbolic-ref --short HEAD', { cwd: tempDir });
            defaultBranch = stdout.trim();
        } catch (branchError: unknown) {
             const branchErrorMessage = getErrorMessage(branchError);
             console.warn('[Task Handler] Could not detect default branch name, assuming ' + defaultBranch + '. Error: ' + branchErrorMessage);
        }
        console.log('[Task Handler] Detected default branch as ' + defaultBranch + ' in temp repo.');

        await execAsync('git push origin ' + defaultBranch, { cwd: tempDir }); // Avoid template literal
        console.log('[Task Handler] Pushed initial commit from temp repo to bare repo.');

        console.log('[Task Handler] Successfully created git repo for project: ' + projectName);
        return { success: true, message: 'Git repository created successfully.', repoPath: repoPath };

    } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        console.error('[Task Handler] Error creating git repo for project ' + projectName + ':', errorMessage);
        
        if (repoPath) {
            try {
                await fs.rm(repoPath, { recursive: true, force: true });
                console.log('[Task Handler] Cleaned up potentially incomplete bare repo at: ' + repoPath);
            } catch (cleanupError: unknown) {
                const cleanupErrorMessage = getErrorMessage(cleanupError);
                console.error('[Task Handler] Error cleaning up bare repo ' + repoPath + ':', cleanupErrorMessage);
            }
        }
        return { success: false, message: 'Failed to create git repository: ' + errorMessage };
    } finally {
        if (tempDir) {
            try {
                await fs.rm(tempDir, { recursive: true, force: true });
                console.log('[Task Handler] Cleaned up temporary directory: ' + tempDir);
            } catch (cleanupError: unknown) {
                const cleanupErrorMessage = getErrorMessage(cleanupError);
                console.error('[Task Handler] Error cleaning up temporary directory ' + tempDir + ':', cleanupErrorMessage);
            }
        }
    }
}
