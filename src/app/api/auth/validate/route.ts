import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'DEFAULT_VERY_SECRET_KEY_REPLACE_ME'; 
const SESSION_COOKIE_NAME = 'collabflow_session';
const SESSION_DURATION_SECONDS = 3 * 24 * 60 * 60; // 3 days

interface AuthToken {
    token: string;
    user_id: number; 
    type: 'link' | 'session';
    expires_at: string; 
}

// Route Handler for GET /api/auth/validate?token=...
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const linkToken = searchParams.get('token');

    // Removed unused 'status' parameter from handleError
    const handleError = (message: string) => {
        const url = new URL('/auth/error', request.url);
        url.searchParams.set('message', message);
        return NextResponse.redirect(url.toString(), 302);
    };

    if (!linkToken || typeof linkToken !== 'string') {
        return handleError('Invalid or missing authentication token link.');
    }

    try {
        // Find the link token
        const getTokenStmt = db.prepare('SELECT token, user_id, type, expires_at FROM auth_tokens WHERE token = ? AND type = ?');
        const tokenRecord = getTokenStmt.get(linkToken, 'link') as AuthToken | undefined;

        if (!tokenRecord) {
            console.warn('Auth link token not found or not type link: ' + linkToken);
            return handleError('Invalid or expired authentication link.');
        }

        // Check expiration
        const now = new Date();
        const expiresAt = new Date(tokenRecord.expires_at); 
        
        console.log('Current server time (UTC): ' + now.toISOString());
        console.log('Token expires at (UTC): ' + expiresAt.toISOString());
        
        if (now > expiresAt) {
            console.warn('Auth link token expired: ' + linkToken);
            db.prepare('DELETE FROM auth_tokens WHERE token = ?').run(linkToken);
            return handleError('Authentication link has expired.');
        }

        // --- Link token is valid! --- 
        const userId = parseInt(tokenRecord.user_id.toString(), 10);
        console.log('Auth link token validated successfully for user ID: ' + userId);

        // 1. Delete used link token
        db.prepare('DELETE FROM auth_tokens WHERE token = ?').run(linkToken);
        console.log('Deleted used auth link token: ' + linkToken);

        // 2. Generate session JWT
        const sessionPayload = { userId }; 
        const secretKey = new TextEncoder().encode(JWT_SECRET);
        const sessionToken = await new jose.SignJWT(sessionPayload)
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime(SESSION_DURATION_SECONDS + 's') // Use string interpolation
            .setIssuedAt()
            .sign(secretKey);

        // 3. Create response and set cookie
        const dashboardUrl = new URL('/dashboard', request.url);
        dashboardUrl.searchParams.set('welcome', 'true');
        
        const response = NextResponse.redirect(dashboardUrl.toString(), 302);
        response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: SESSION_DURATION_SECONDS,
        });
        console.log('Session cookie set for user ID: ' + userId + '. Redirecting to dashboard with welcome parameter.');

        return response;

    } catch (error: unknown) { // Use unknown instead of any
        let errorMessage = 'An unexpected server error occurred during authentication.';
        if (error instanceof Error) {
             errorMessage = error.message;
        }
        console.error('[API /api/auth/validate GET] Error:', errorMessage);
        // Pass generic error message to user via handleError
        return handleError('An unexpected server error occurred during authentication.');
    }
} 
