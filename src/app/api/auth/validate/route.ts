import { NextRequest, NextResponse } from 'next/server';
// import { cookies } from 'next/headers'; // Can still read cookies if needed
import { db } from '@/lib/db';
import { getAppSeed, createSessionToken, SESSION_COOKIE_NAME, PERMANENT_COOKIE_MAX_AGE, validateAppSeed } from '@/lib/auth';
import * as jose from 'jose';

// Force Node.js runtime
export const runtime = 'nodejs';

const JWT_SECRET = process.env.JWT_SECRET; // Read directly from env

// Add a check to ensure JWT_SECRET is loaded in the API route context
if (!JWT_SECRET) {
    console.error('CRITICAL: JWT_SECRET is not set in the API route environment. Check server environment configuration.');
    // Optionally, throw an error or return a specific response
    // For now, we'll let the subsequent verification fail, but logging is important.
} else {
    // Log the secret being used for verification (partially)
    const secretForLog = JWT_SECRET.length > 8 ? `${JWT_SECRET.substring(0, 4)}...${JWT_SECRET.substring(JWT_SECRET.length - 4)}` : 'SECRET_TOO_SHORT';
    console.log(`[API AUTH VALIDATE] Using JWT_SECRET for verification: ${secretForLog}`);
}

// Route Handler for GET /api/auth/validate?token=...
export async function GET(request: NextRequest) {
    // Set flag to indicate we're in auth flow to prevent migrations from running
    if (typeof global !== 'undefined') {
        // Use unknown for type safety
        (global as unknown as { IS_AUTH_FLOW?: boolean }).IS_AUTH_FLOW = true;
    }
    
    try {
        // Extract token from URL query parameters
        const searchParams = request.nextUrl.searchParams;
        const token = searchParams.get('token');
        
        // Return error if no token provided
        if (!token) {
            // Redirect to error page with message
            return NextResponse.redirect(new URL('/error?type=auth_missing_token', request.url));
        }
        
        // Verify token using jose
        let payload;
        try {
            // Ensure JWT_SECRET is available before encoding
            if (!JWT_SECRET) {
                 console.error('[API AUTH VALIDATE] Attempting verification but JWT_SECRET is missing! Check environment loading.');
                 // Return a server configuration error immediately
                 return NextResponse.redirect(new URL('/error?type=server_config_error&detail=jwt_secret_missing', request.url));
            }
            const secretKey = new TextEncoder().encode(JWT_SECRET);
            const { payload: verifiedPayload } = await jose.jwtVerify(token, secretKey);
            payload = verifiedPayload;
        } catch (error) {
            console.error('Token verification failed:', error);
            return NextResponse.redirect(new URL('/error?type=auth_invalid_token', request.url));
        }
        
        // Use specific type instead of any
        const linkPayload = payload as { 
            userId: number; 
            type: 'admin_link' | 'user_link'; 
            appSeed: string; 
            exp: number 
        };
        
        // Validate token type and app seed
        if ((linkPayload.type !== 'admin_link' && linkPayload.type !== 'user_link')) {
            console.error('Token validation failed: Invalid token type', linkPayload.type);
            return NextResponse.redirect(new URL('/error?type=auth_invalid_token_type', request.url));
        }
        
        // Check if token has expired
        const now = Math.floor(Date.now() / 1000);
        if (linkPayload.exp && linkPayload.exp < now) {
            console.warn(`Token expired at ${new Date(linkPayload.exp * 1000).toISOString()}, current time: ${new Date(now * 1000).toISOString()}`);
            return NextResponse.redirect(new URL('/error?type=auth_token_expired', request.url));
        }
        
        // Log the full seed values for debugging
        const tokenSeed = linkPayload.appSeed;
        const currentAppSeed = getAppSeed();
        
        console.log(`[JWT LINK VALIDATION] Token seed: ${tokenSeed} | Current app seed: ${currentAppSeed}`);
        
        // Validate application seed in token matches our current seed
        if (!validateAppSeed(linkPayload.appSeed)) {
            console.warn('Invalid application seed in token');
            return NextResponse.redirect(new URL('/error?type=auth_invalid_token_config', request.url));
        }
        
        // Verify the token exists in the database and isn't already used
        try {
            // Update the query to work with the actual table structure (without the type column)
            const tokenRecord = db.prepare('SELECT * FROM auth_tokens WHERE token = ?').get(token);
            
            if (!tokenRecord) {
                console.warn('Token not found in database');
                return NextResponse.redirect(new URL('/error?type=auth_token_not_found', request.url));
            }
            
            // Check if the token has been used (if the column exists)
            if (tokenRecord.used) {
                console.warn('Token has already been used');
                return NextResponse.redirect(new URL('/error?type=auth_token_already_used', request.url));
            }
            
            // Ensure the token's user ID matches what's in the payload
            if (parseInt(tokenRecord.user_id, 10) !== parseInt(linkPayload.userId.toString(), 10)) {
                console.warn('Token user ID mismatch');
                return NextResponse.redirect(new URL('/error?type=auth_invalid_token', request.url));
            }
            
            // Delete the token to prevent reuse
            db.prepare('DELETE FROM auth_tokens WHERE token = ?').run(token);
        } catch (error) {
            console.error('Database error when validating token:', error);
            return NextResponse.redirect(new URL('/error?type=server_db_error', request.url));
        }
        
        // Extract and validate userId
        const userId = parseInt(linkPayload.userId.toString(), 10);
        if (isNaN(userId)) {
            console.error('Invalid user ID in token:', linkPayload.userId);
            return NextResponse.redirect(new URL('/error?type=auth_invalid_token_data', request.url));
        }
        
        // Generate a permanent session token
        const sessionToken = await createSessionToken(userId);
        
        // Create a redirect response with session cookie
        const response = NextResponse.redirect(new URL('/dashboard?welcome=true', request.url));
        
        // Set a permanent session cookie (10 years)
        response.cookies.set({
            name: SESSION_COOKIE_NAME,
            value: sessionToken,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: PERMANENT_COOKIE_MAX_AGE
        });
        
        return response;
    } catch (error) {
        console.error('Error in token validation:', error);
        return NextResponse.redirect(new URL('/error?type=server_error', request.url));
    }
} 