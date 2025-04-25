import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose'; // Import jwtVerify
import { SESSION_COOKIE_NAME } from '@/lib/auth';
import '@/lib/env'; // Import for side effect to ensure env vars are loaded

// Force Node.js runtime
export const runtime = 'nodejs';

// Load JWT secret from environment process
const secret = process.env.JWT_SECRET;
if (!secret) {
  console.error('FATAL ERROR: JWT_SECRET environment variable is not set.');
  // In a real app, we should prevent starting the server with missing security credentials
  throw new Error('JWT_SECRET must be set in environment variables. Check env/security.env file.');
}

// Convert JWT secret to bytes for use with jose
const JWT_SECRET_BYTES = new TextEncoder().encode(secret);

// List of public paths that don't require authentication
const PUBLIC_PATHS = [
  '/', // Splash page
  '/error', // Unified Error page (changed from /auth/error)
  '/api/auth/validate', // Auth validation endpoint itself
  '/api/health', // Health check endpoint
  '/assets/', // Allow assets directory
  '/favicon.ico',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log(`[Middleware] === Request for: ${pathname} ===`); // DIAGNOSTIC LOG
  console.log(`[Middleware] Effective PUBLIC_PATHS: ${JSON.stringify(PUBLIC_PATHS)}`); // DIAGNOSTIC LOG

  // Check if the current path matches any of the public paths - with detailed logging
  let isPublicPath = false;
  console.log(`[Middleware] Checking public path status for: ${pathname}`);
  for (const path of PUBLIC_PATHS) {
    let condition = false;
    // Handle root path specifically: only exact match
    if (path === '/') {
        condition = pathname === path;
    } else {
        // Original logic for other paths (exact match or prefix match for dirs)
        condition = pathname === path || (path.endsWith('/') && pathname.startsWith(path));
    }
    console.log(`[Middleware]   Comparing '${pathname}' with '${path}': ${condition}`); // Updated log
    if (condition) {
      isPublicPath = true;
      console.log(`[Middleware]   Match found! Setting isPublicPath to true.`);
      break;
    }
  }
  // Original log after the check
  console.log(`[Middleware] Path: ${pathname}, Is Public: ${isPublicPath}`); // DIAGNOSTIC LOG

  // Explicitly allow static assets and framework files identified by matcher
  // The config.matcher should handle most static file exclusions.
  // Let's simplify the internal checks.

  // We ONLY explicitly bypass the main check for genuinely public paths.
  if (isPublicPath) {
    console.log(`[Middleware] Path: ${pathname}, Allowing public path.`); // DIAGNOSTIC LOG
    return NextResponse.next();
  }

  // If it's NOT a public path, proceed to token validation.
  console.log(`[Middleware] Path: ${pathname}, Entering token validation block.`); // DIAGNOSTIC LOG
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    console.log(`[Middleware] Path: ${pathname}, No token found. Redirecting to /.`); // DIAGNOSTIC LOG
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    // Validate the token
    const { payload } = await jwtVerify(token, JWT_SECRET_BYTES, {
      algorithms: ['HS256'],
    });

    // Check if it's a session token
    if (payload.type !== 'session') {
      console.warn(`[Middleware] Path: ${pathname}, Invalid token type: ${payload.type}. Redirecting.`); // DIAGNOSTIC LOG
      throw new Error('Invalid token type');
    }

    // Token is valid and is a session token
    // Extract userId from payload
    const userId = payload.userId as number; // Assuming userId is stored in the payload

    if (!userId || typeof userId !== 'number') {
        console.error(`[Middleware] Path: ${pathname}, Invalid or missing userId in session token payload. Payload:`, payload);
        throw new Error('Invalid userId in session token');
    }

    // Create new headers object from incoming request headers
    const requestHeaders = new Headers(request.headers);
    // Add the user ID to the request headers
    requestHeaders.set('x-user-id', userId.toString());

    // Create the response to forward the request with modified headers
    const response = NextResponse.next({
        request: {
            // New request object with the updated headers
            headers: requestHeaders,
        },
    });

    console.log(`[Middleware] Path: ${pathname}, Token valid. Attaching x-user-id: ${userId}. Allowing access.`); // DIAGNOSTIC LOG
    return response; // Return the modified response
  } catch (error: any) {
    // Token validation failed (expired, invalid signature, wrong type, etc.)
    console.warn(`[Middleware] Path: ${pathname}, Token validation failed: ${error.message}. Redirecting to /.`); // DIAGNOSTIC LOG
    // Clear potentially invalid cookie
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.set(SESSION_COOKIE_NAME, '', { maxAge: -1 });
    return response;
  }

  // This part should theoretically not be reached if logic is correct
  // console.warn(`[Middleware] Path: ${pathname}, Reached end of middleware unexpectedly.`);
  // return NextResponse.next(); // Defaulting to next() might be unsafe if reached unexpectedly
}

// Configure the matcher
export const config = {
  matcher: [
    // Match all paths except specific static files patterns at the edge config level
    // More specific checks are done inside the middleware function
    '/((?!_next/static|_next/image|favicon.ico|assets/).*)',
  ],
  // Ensure runtime is still nodejs explicitly in config as well
  runtime: 'nodejs',
};
