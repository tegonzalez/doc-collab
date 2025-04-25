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
  payload: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  result?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  error?: string;
  createdAt: Date;
  updatedAt: Date;
} 