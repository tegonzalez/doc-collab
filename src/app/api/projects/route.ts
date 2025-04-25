import { NextRequest, NextResponse } from 'next/server';
import { queueManager } from '@/lib/queue/manager';
import { Task } from '@/lib/queue/interface';

// GET /api/projects - List projects
export async function GET() {
  try {
    // Placeholder implementation that would retrieve projects from storage
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
    const data = await request.json();
    
    if (!data.name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }
    
    // Add task to queue to create the project
    const taskId = queueManager.addTask('create_project', { projectName: data.name });
    
    return NextResponse.json({ 
      taskId,
      message: 'Project creation initiated',
      status: 'pending'
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
} 