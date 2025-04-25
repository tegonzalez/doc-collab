import { NextRequest, NextResponse } from 'next/server';
import * as UserService from '@/lib/db/users';
import { validateAppSeed } from '@/lib/auth';

// Get user settings
export async function GET(request: NextRequest) {
  try {
    // Get user ID from session
    const userId = request.headers.get('x-user-id');
    const appSeed = request.headers.get('x-app-seed');
    
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
    
    // First validate the seed value matches the application seed
    // This ensures the token is still valid even if database was reset
    if (appSeed) {
      try {
        const isValidSeed = validateAppSeed(appSeed);
        if (!isValidSeed) {
          console.warn(`Invalid application seed value in request for user ID ${numericUserId}`);
          return NextResponse.json(
            { 
              error: 'Authentication Error',
              details: 'Unable to retrieve user settings. The database may have been reset or the application configuration has changed.'
            },
            { status: 401 }
          );
        }
      } catch (error) {
        // If we can't validate the seed, reject the request
        console.error(`Error validating application seed for user ID ${numericUserId}:`, error);
        return NextResponse.json(
          { 
            error: 'Authentication Error',
            details: 'Unable to validate your session.'
          },
          { status: 401 }
        );
      }
    }
    
    // Get user settings
    const settings = UserService.getUserById(numericUserId);
    
    if (!settings) {
      console.warn(`User not found with ID ${numericUserId}`);
      return NextResponse.json(
        { 
          error: 'User not found',
          details: 'The requested user account could not be found in the database.'
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json(settings);
  } catch (error: unknown) {
    console.error('Error retrieving user settings:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Error retrieving settings',
        details: message
      },
      { status: 500 }
    );
  }
}

// Update user settings
export async function PUT(request: NextRequest) {
  try {
    // Get user ID from session
    const userId = request.headers.get('x-user-id');
    const appSeed = request.headers.get('x-app-seed');
    
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
    
    // First validate the seed value matches the application seed
    if (appSeed) {
      try {
        const isValidSeed = validateAppSeed(appSeed);
        if (!isValidSeed) {
          console.warn(`Invalid application seed value in request for user ID ${numericUserId}`);
          return NextResponse.json(
            { 
              error: 'Authentication Error',
              details: 'Unable to update user settings. The database may have been reset or the application configuration has changed.'
            },
            { status: 401 }
          );
        }
      } catch (error) {
        // If we can't validate the seed, reject the request
        console.error(`Error validating application seed for user ID ${numericUserId}:`, error);
        return NextResponse.json(
          { 
            error: 'Authentication Error',
            details: 'Unable to validate your session.'
          },
          { status: 401 }
        );
      }
    }
    
    // Verify user exists
    const existingUser = UserService.getUserById(numericUserId);
    
    if (!existingUser) {
      return NextResponse.json(
        { 
          error: 'User not found',
          details: 'The requested user account could not be found in the database.'
        },
        { status: 404 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const results: Record<string, boolean> = {};
    
    // Update settings based on what was provided
    try {
      // Update display name if provided
      if (body.displayName !== undefined) {
        results.displayName = UserService.updateDisplayName(numericUserId, body.displayName);
      }
      
      // Update timezone if provided
      if (body.timezone !== undefined) {
        results.timezone = UserService.updateTimezone(numericUserId, body.timezone);
      }
      
      // Update notification settings if provided
      if (body.notificationSettings !== undefined) {
        // Ensure notificationSettings has expected properties with defaults
        const notificationSettings = {
          email: body.notificationSettings?.email ?? existingUser.notificationSettings.email ?? true,
          ui: body.notificationSettings?.ui ?? existingUser.notificationSettings.ui ?? true
        };
        
        results.notificationSettings = UserService.updateNotificationSettings(
          numericUserId, 
          notificationSettings
        );
      }
      
      // Update SSH keys if provided
      if (body.sshKeys !== undefined) {
        // Ensure sshKeys is an array
        const sshKeys = Array.isArray(body.sshKeys) ? body.sshKeys : [];
        results.sshKeys = UserService.updateSshKeys(numericUserId, sshKeys);
      }
      
      return NextResponse.json({
        success: true,
        results
      });
    } catch (serviceError: unknown) {
      console.error('Service error while updating settings:', serviceError);
      const message = serviceError instanceof Error ? serviceError.message : 'Unknown service error';
      return NextResponse.json(
        { 
          error: message,
          details: 'A service error occurred while updating your settings.'
        },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    console.error('Error updating user settings:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Error updating settings',
        details: message
      },
      { status: 500 }
    );
  }
} 