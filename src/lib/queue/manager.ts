import crypto from 'crypto';
import { Task, TaskStatus } from './interface';
import { exec } from 'child_process';
import util from 'util';

// Promisify exec for easier async/await usage
const execPromise = util.promisify(exec);

// TODO: Integrate with a proper server-side notification mechanism
// This is a placeholder - useNotifications is a client-side hook.
const sendNotification = (type: 'info' | 'success' | 'error', message: string, details?: string) => {
  console.log(`[Notification] ${type.toUpperCase()}: ${message}${details ? ' - ' + details : ''}`);
};

// Queue manager for handling background tasks

class QueueManager {
  private tasks: Map<string, Task> = new Map();
  private static instance: QueueManager;

  private constructor() {}

  public static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  /**
   * Add a task to the queue
   */
  addTask(type: string, payload: any): string {
    const id = `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const task: Task = {
      id,
      type,
      status: TaskStatus.PENDING,
      payload,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.tasks.set(id, task);
    
    // Simulate async processing
    setTimeout(() => {
      this.processTask(id);
    }, 100);
    
    return id;
  }

  /**
   * Process a task
   */
  private processTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    
    task.status = TaskStatus.RUNNING;
    task.updatedAt = new Date();
    this.tasks.set(taskId, task);
    
    // Simulate task execution
    setTimeout(() => {
      try {
        // This would normally call actual implementations based on task.type
        if (task.type === 'create_project') {
          task.result = { projectId: `project_${Math.random().toString(36).substring(2, 9)}` };
          task.status = TaskStatus.SUCCESS;
        } else {
          task.result = { message: 'Task processed successfully' };
          task.status = TaskStatus.SUCCESS;
        }
      } catch (error) {
        task.status = TaskStatus.FAILED;
        task.error = error instanceof Error ? error.message : 'Unknown error';
      }
      
      task.updatedAt = new Date();
      this.tasks.set(taskId, task);
    }, 500);
  }

  /**
   * Get a task by ID
   */
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Get all tasks
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  // --- Task Handlers ---

  private async _handleCreateProject(payload: { projectName: string }): Promise<{ stdout: string; stderr: string }> {
    const { projectName } = payload;
    if (!projectName || !/^[a-zA-Z0-9_-]+$/.test(projectName)) {
      throw new Error('Invalid project name. Use letters, numbers, underscores, or hyphens.');
    }

    // IMPORTANT: Ensure this path aligns with Docker volume and setup_git.sh
    const projectPath = `/app/projects/${projectName}.git`;
    const command = `git init --bare ${projectPath}`;

    console.log(`Executing command: ${command}`);
    // Execute as the container's default user (collabflow)
    const { stdout, stderr } = await execPromise(command);

    // Potentially check stderr for warnings, even if no error is thrown
    if (stderr) {
      console.warn(`Stderr for git init (${projectName}):`, stderr);
    }

    console.log(`Successfully initialized git repo for ${projectName}`);
    return { stdout, stderr };
  }

  // Example placeholder for another task type
  // private async _handleRunPandoc(payload: any): Promise<any> {
  //   console.log('Running pandoc task with payload:', payload);
  //   // ... implementation ...
  //   await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate work
  //   return { message: 'Pandoc conversion simulated.' };
  // }

}

// Export a singleton instance
export const queueManager = QueueManager.getInstance(); 