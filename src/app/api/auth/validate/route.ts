import { NextRequest, NextResponse } from 'next/server';
// import { cookies } from 'next/headers'; // Can still read cookies if needed
import { db } from '@/lib/db';
import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'DEFAULT_VERY_SECRET_KEY_REPLACE_ME'; // Use environment variable!
const SESSION_COOKIE_NAME = 'collabflow_session';
// Set a very long expiration - effectively permanent (10 years)
const PERMANENT_COOKIE_MAX_AGE = 10 * 365 * 24 * 60 * 60; // 10 years in seconds

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
        // console.log(`HandleError redirecting with status: ${status}`); // Keep for debugging if needed
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

        // 2. Generate a new permanent session JWT (different from the link token) 
        // containing only the userId (internal identifier)
        const sessionPayload = { userId };
        
        // Create the permanent JWT - deliberately no expiration
        const secretKey = new TextEncoder().encode(JWT_SECRET);
        const sessionToken = await new jose.SignJWT(sessionPayload)
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .sign(secretKey);

        // 3. Create response and set permanent cookie
        const dashboardUrl = new URL('/dashboard', request.url);
        dashboardUrl.searchParams.set('welcome', 'true');
        
        const response = NextResponse.redirect(dashboardUrl.toString(), 302);
        
        // Set a truly permanent cookie with explicit long expiration
        response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: PERMANENT_COOKIE_MAX_AGE // Set very long expiration to persist past browser close
        });
        console.log(`Truly permanent session cookie set for user ID: ${userId} (expires in 10 years). Redirecting to dashboard.`);

        return response;

    } catch (error: any) {
        console.error('[API /api/auth/validate GET] Error:', error);
        return handleError('An unexpected server error occurred during authentication.', 500);
    }
} 