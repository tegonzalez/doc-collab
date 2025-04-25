import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers'; // Can still read cookies if needed
import { db } from '@/lib/db';
import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'DEFAULT_VERY_SECRET_KEY_REPLACE_ME'; // Use environment variable!
const SESSION_COOKIE_NAME = 'collabflow_session';
const SESSION_DURATION_SECONDS = 3 * 24 * 60 * 60; // 3 days (changed from 7 days)

// Interface representing the token record from the database
interface AuthToken {
    token: string;
    user_id: number; // Internal user identifier (integer in the database)
    type: 'link' | 'session';
    expires_at: string; // ISO 8601 format from DB
}

// Route Handler for GET /api/auth/validate?token=...
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const linkToken = searchParams.get('token');

    const handleError = (message: string, status: number = 400) => {
        // Redirect to an error page on the frontend, passing the message
        const url = new URL('/auth/error', request.url); // Assume an error page at /auth/error
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
            console.warn(`Auth link token not found or not type 'link': ${linkToken}`);
            return handleError('Invalid or expired authentication link.');
        }

        // Check expiration - comparing with UTC dates
        const now = new Date(); // Current time in local timezone
        const expiresAt = new Date(tokenRecord.expires_at); // Parse ISO string to date (preserves UTC)
        
        // Log timestamps for debugging
        console.log(`Current server time (UTC): ${now.toISOString()}`);
        console.log(`Token expires at (UTC): ${expiresAt.toISOString()}`);
        
        if (now > expiresAt) {
            console.warn(`Auth link token expired: ${linkToken}`);
            db.prepare('DELETE FROM auth_tokens WHERE token = ?').run(linkToken);
            return handleError('Authentication link has expired.');
        }

        // --- Link token is valid! --- 
        // Ensure userId is an integer
        const userId = parseInt(tokenRecord.user_id.toString(), 10);
        console.log(`Auth link token validated successfully for user ID: ${userId}`);

        // 1. Delete used link token
        db.prepare('DELETE FROM auth_tokens WHERE token = ?').run(linkToken);
        console.log(`Deleted used auth link token: ${linkToken}`);

        // 2. Generate session JWT containing only the userId (internal identifier)
        // The display name is fetched from the database when needed in the UI
        const sessionPayload = { userId }; // userId is parsed to an integer
        
        // Use jose to create the JWT
        const secretKey = new TextEncoder().encode(JWT_SECRET);
        const sessionToken = await new jose.SignJWT(sessionPayload)
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
            .setIssuedAt()
            .sign(secretKey);

        // 3. Create response and set cookie
        // Add welcome=true parameter to show welcome notification
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
        console.log(`Session cookie set for user ID: ${userId}. Redirecting to dashboard with welcome parameter.`);

        return response;

    } catch (error: any) {
        console.error('[API /api/auth/validate GET] Error:', error);
        return handleError('An unexpected server error occurred during authentication.', 500);
    }
} 