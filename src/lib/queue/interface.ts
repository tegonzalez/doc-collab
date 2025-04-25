// Queue related interfaces

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'processing',
  SUCCESS = 'completed',
  FAILED = 'failed'
}

export interface Task {
  id: string;
  type: string;
  status: TaskStatus;
  payload: any;
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
} 