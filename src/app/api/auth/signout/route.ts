import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = 'collabflow_session';

export async function POST(request: NextRequest) {
    try {
        // Create a response that will delete the session cookie
        const response = NextResponse.json(
            { success: true, message: 'Successfully signed out' }, 
            { status: 200 }
        );

        // Delete the session cookie
        response.cookies.delete(SESSION_COOKIE_NAME);
        
        console.log('User signed out: Session cookie deleted');
        
        return response;
    } catch (error) {
        console.error('[API /api/auth/signout POST] Error:', error);
        return NextResponse.json(
            { success: false, message: 'An error occurred during sign out' },
            { status: 500 }
        );
    }
} 