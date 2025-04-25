import { NextRequest, NextResponse } from 'next/server';
import * as UserService from '@/lib/db/users';

// Add a new email address
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
    if (!body.email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }
    
    // Add email
    try {
      const emailId = UserService.addEmail(
        numericUserId, 
        body.email, 
        !!body.isPrimary
      );
      
      return NextResponse.json({
        success: true,
        emailId
      });
    } catch (e: unknown) {
      console.error('Service error while adding email:', e);
      const errorMessage = e instanceof Error ? e.message : 'Error adding email';
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    console.error('Error adding email address:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Error adding email: ' + errorMessage },
      { status: 500 }
    );
  }
}

// Update an email address (set primary, etc.)
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
    if (!body.emailId) {
      return NextResponse.json(
        { error: 'Email ID is required' },
        { status: 400 }
      );
    }
    
    const numericEmailId = parseInt(body.emailId, 10);
    
    if (isNaN(numericEmailId) || numericEmailId <= 0) {
      return NextResponse.json(
        { error: 'Invalid email ID format' },
        { status: 400 }
      );
    }
    
    // Update email
    try {
      const success = UserService.updateEmail(
        numericUserId, 
        numericEmailId, 
        !!body.isPrimary
      );
      
      return NextResponse.json({ 
        success,
        message: success ? 'Email updated successfully' : 'No changes made' 
      });
    } catch (e: unknown) {
      console.error('Service error while updating email:', e);
      const errorMessage = e instanceof Error ? e.message : 'Error updating email';
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    console.error('Error updating email address:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Error updating email: ' + errorMessage },
      { status: 500 }
    );
  }
}

// Delete an email address
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
    
    // Get email ID from URL
    const { searchParams } = new URL(request.url);
    const emailId = searchParams.get('id');
    
    if (!emailId) {
      return NextResponse.json(
        { error: 'Email ID is required' },
        { status: 400 }
      );
    }
    
    const numericEmailId = parseInt(emailId, 10);
    
    if (isNaN(numericEmailId) || numericEmailId <= 0) {
      return NextResponse.json(
        { error: 'Invalid email ID format' },
        { status: 400 }
      );
    }
    
    // Delete email
    try {
      const success = UserService.removeEmail(numericUserId, numericEmailId);
      return NextResponse.json({ 
        success,
        message: success ? 'Email removed successfully' : 'Email not found'
      });
    } catch (e: unknown) {
      console.error('Service error while removing email:', e);
      const errorMessage = e instanceof Error ? e.message : 'Error removing email';
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    console.error('Error deleting email address:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Error removing email: ' + errorMessage },
      { status: 500 }
    );
  }
} 