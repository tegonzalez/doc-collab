import { NextRequest, NextResponse } from 'next/server';
import * as UserService from '@/lib/db/users';

// Add a new SSH key
export async function POST(request: NextRequest) {
  try {
    // Get user ID from session
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - User ID is required' }, 
        { status: 401 }
      );
    }
    
    const numericUserId = parseInt(userId, 10);
    
    if (isNaN(numericUserId) || numericUserId <= 0) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }
    
    // Verify user exists
    const existingUser = UserService.getUserById(numericUserId);
    
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.keyValue) {
      return NextResponse.json(
        { error: 'SSH key value is required' },
        { status: 400 }
      );
    }
    
    // Add SSH key
    try {
      const keyId = UserService.addSshKey(
        numericUserId, 
        body.keyValue, 
        body.keyName || null
      );
      
      return NextResponse.json({
        success: true,
        keyId
      });
    } catch (e: unknown) {
      console.error('Service error adding SSH key:', e);
      const message = e instanceof Error ? e.message : 'Error adding SSH key';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('Error adding SSH key:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Error adding SSH key: ' + message }, { status: 500 });
  }
}

// Update an SSH key (rename)
export async function PUT(request: NextRequest) {
  try {
    // Get user ID from session
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - User ID is required' }, 
        { status: 401 }
      );
    }
    
    const numericUserId = parseInt(userId, 10);
    
    if (isNaN(numericUserId) || numericUserId <= 0) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }
    
    // Verify user exists
    const existingUser = UserService.getUserById(numericUserId);
    
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.keyId) {
      return NextResponse.json(
        { error: 'SSH key ID is required' },
        { status: 400 }
      );
    }
    
    if (!body.keyName) {
      return NextResponse.json(
        { error: 'SSH key name is required' },
        { status: 400 }
      );
    }
    
    const numericKeyId = parseInt(body.keyId, 10);
    
    if (isNaN(numericKeyId) || numericKeyId <= 0) {
      return NextResponse.json(
        { error: 'Invalid SSH key ID format' },
        { status: 400 }
      );
    }
    
    // Update SSH key
    try {
      const success = UserService.updateSshKey(
        numericUserId, 
        numericKeyId, 
        body.keyName
      );
      
      return NextResponse.json({ 
        success,
        message: success ? 'SSH key updated successfully' : 'No changes made' 
      });
    } catch (e: unknown) {
      console.error('Service error updating SSH key:', e);
      const message = e instanceof Error ? e.message : 'Error updating SSH key';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('Error updating SSH key:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Error updating SSH key: ' + message }, { status: 500 });
  }
}

// Delete an SSH key
export async function DELETE(request: NextRequest) {
  try {
    // Get user ID from session
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - User ID is required' }, 
        { status: 401 }
      );
    }
    
    const numericUserId = parseInt(userId, 10);
    
    if (isNaN(numericUserId) || numericUserId <= 0) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }
    
    // Verify user exists
    const existingUser = UserService.getUserById(numericUserId);
    
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get key ID from URL
    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get('id');
    
    if (!keyId) {
      return NextResponse.json(
        { error: 'SSH key ID is required' },
        { status: 400 }
      );
    }
    
    const numericKeyId = parseInt(keyId, 10);
    
    if (isNaN(numericKeyId) || numericKeyId <= 0) {
      return NextResponse.json(
        { error: 'Invalid SSH key ID format' },
        { status: 400 }
      );
    }
    
    // Delete SSH key
    try {
      const success = UserService.removeSshKey(numericUserId, numericKeyId);
      return NextResponse.json({ 
        success,
        message: success ? 'SSH key removed successfully' : 'SSH key not found'
      });
    } catch (e: unknown) {
      console.error('Service error removing SSH key:', e);
      const message = e instanceof Error ? e.message : 'Error removing SSH key';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('Error removing SSH key:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Error removing SSH key: ' + message }, { status: 500 });
  }
} 