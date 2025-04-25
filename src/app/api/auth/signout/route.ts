import { SESSION_COOKIE_NAME } from '@/lib/auth';
import { NextResponse } from 'next/server';

// Force Node.js runtime
export const runtime = 'nodejs';

export async function POST() {
    try {
        console.log('Attempting to sign out user...');
        
        // Create a response
        const response = NextResponse.json({ message: 'Signed out successfully' }, { status: 200 });
        
        // Delete the session cookie on the response
        response.cookies.set(SESSION_COOKIE_NAME, '', {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            maxAge: 0, // Expire the cookie immediately
            path: '/',
            sameSite: 'lax',
        });
        
        console.log('User signed out: Session cookie cleared.');
        return response;
    } catch (error) {
        console.error('Error during signout:', error);
        return NextResponse.json({ message: 'Sign out failed' }, { status: 500 });
    }
} 