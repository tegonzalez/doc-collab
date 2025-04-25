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
    repoHash: string; // Used to construct the final repo path
    repoPath: string; // The final absolute path for the bare repo
    manifestContent: string;
}

export async function handleCreateGitRepoWithManifest(payload: CreateGitRepoPayload): Promise<{ success: boolean; message: string; repoPath?: string }> {
    const { repoPath, manifestContent, projectName } = payload;
    let tempDir: string | undefined;

    console.log(`[Task Handler] Starting CREATE_GIT_REPO_WITH_MANIFEST for project: ${projectName} at ${repoPath}`);

    try {
        // 1. Create a temporary directory
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'temp-repo-'));
        console.log(`[Task Handler] Created temporary directory: ${tempDir}`);

        // 2. Initialize a standard Git repository inside it
        await execAsync('git init', { cwd: tempDir });
        console.log(`[Task Handler] Initialized standard repo in temp directory.`);

        // 3. Write the manifest.json file
        const manifestPath = path.join(tempDir, 'manifest.json');
        await fs.writeFile(manifestPath, manifestContent);
        console.log(`[Task Handler] Wrote manifest.json to temp directory.`);

        // Set git user config for the commit (important for CI/automation)
        // Use generic details or specific ones if available/needed
        await execAsync('git config user.email "automation@example.com"', { cwd: tempDir });
        await execAsync('git config user.name "Automation Script"', { cwd: tempDir });


        // 4. Add and commit the manifest
        await execAsync('git add manifest.json', { cwd: tempDir });
        await execAsync('git commit -m "Initial commit: Add manifest.json"', { cwd: tempDir });
        console.log(`[Task Handler] Committed manifest.json in temp repo.`);

        // 5. Initialize the bare repository at the final repoPath
        // Ensure the parent directory exists (needed for bare repo creation)
        const parentDir = path.dirname(repoPath);
        await fs.mkdir(parentDir, { recursive: true });
        await execAsync(`git init --bare ${repoPath}`);
        console.log(`[Task Handler] Initialized bare repository at: ${repoPath}`);

        // --- Ensure correct ownership and permissions ---
        // This might be crucial depending on how the git server user interacts with the files
        // You might need to run chown/chmod commands here, potentially using sudo
        // Example (adjust user/group and permissions as needed):
        // await execAsync(`sudo chown -R git:git ${repoPath}`);
        // await execAsync(`sudo chmod -R ug+rwX ${repoPath}`);
        // console.log(`[Task Handler] Set ownership/permissions for ${repoPath}`);

        // --- Link hooks ---
        // Ensure the standard hooks are in place for the new bare repo
        // This assumes setup_git.sh placed necessary scripts in a known location
        const hooksDir = path.join(repoPath, 'hooks');
        const scriptsDir = process.env.SCRIPTS_DIR || '/app/docker'; // Get this from env or config

        const preReceiveHookSource = path.join(scriptsDir, 'git-pre-receive-hook.sh');
        const preReceiveHookDest = path.join(hooksDir, 'pre-receive');

        try {
            // Create symlink (safer than copying as updates to the source script are reflected)
            await fs.symlink(preReceiveHookSource, preReceiveHookDest, 'file');
            await fs.chmod(preReceiveHookDest, '755'); // Ensure executable
            console.log(`[Task Handler] Linked pre-receive hook for ${repoPath}`);
        } catch (linkError: any) {
             // Fallback or error handling if linking fails (e.g., script source missing)
             console.error(`[Task Handler] Failed to link pre-receive hook for ${repoPath}: ${linkError.message}`);
             // Decide if this is a critical failure
        }
        // Add linking for other hooks (post-receive, etc.) if needed


        // 6. Push the initial commit from the temporary repo to the bare repo
        // Use the file protocol for local bare repo
        await execAsync(`git remote add origin ${repoPath}`, { cwd: tempDir });
        // Assuming 'master' or 'main'. Git's default might vary. Use 'git branch -M main' after init if needed.
        // Let's try to detect the default branch name created by 'git init'
        let defaultBranch = 'main'; // Default assumption
        try {
            const { stdout } = await execAsync('git symbolic-ref --short HEAD', { cwd: tempDir });
            defaultBranch = stdout.trim();
        } catch (branchError) {
             console.warn(`[Task Handler] Could not detect default branch name, assuming '${defaultBranch}'. Error: ${branchError}`);
        }
        console.log(`[Task Handler] Detected default branch as '${defaultBranch}' in temp repo.`);

        await execAsync(`git push origin ${defaultBranch}`, { cwd: tempDir });
        console.log(`[Task Handler] Pushed initial commit from temp repo to bare repo.`);

        console.log(`[Task Handler] Successfully created and initialized git repo with manifest for project: ${projectName}`);
        return { success: true, message: 'Git repository created successfully.', repoPath: repoPath };

    } catch (error: any) {
        console.error(`[Task Handler] Error creating git repo for project ${projectName}:`, error);
        // Attempt to clean up the bare repo if creation failed mid-way
        if (repoPath) {
            try {
                await fs.rm(repoPath, { recursive: true, force: true });
                console.log(`[Task Handler] Cleaned up potentially incomplete bare repo at: ${repoPath}`);
            } catch (cleanupError: any) {
                console.error(`[Task Handler] Error cleaning up bare repo ${repoPath}:`, cleanupError);
            }
        }
        return { success: false, message: `Failed to create git repository: ${error.message}` };
    } finally {
        // 7. Clean up the temporary directory
        if (tempDir) {
            try {
                await fs.rm(tempDir, { recursive: true, force: true });
                console.log(`[Task Handler] Cleaned up temporary directory: ${tempDir}`);
            } catch (cleanupError: any) {
                console.error(`[Task Handler] Error cleaning up temporary directory ${tempDir}:`, cleanupError);
            }
        }
    }
}
