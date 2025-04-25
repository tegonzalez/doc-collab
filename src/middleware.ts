import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'DEFAULT_VERY_SECRET_KEY_REPLACE_ME'; // Use environment variable!
const SESSION_COOKIE_NAME = 'collabflow_session';

// JWT payload contains only the userId (internal identifier)
// The display name is fetched from the database when needed in the UI
interface SessionPayload {
  userId: number; // Internal user identifier (integer in the database)
  iat: number;
  exp: number;
}

// Function to verify JWT using jose (Edge Runtime compatible)
async function verifyAuth(token: string): Promise<SessionPayload | null> {
  try {
    // Create a secret key from the JWT_SECRET
    const secretKey = new TextEncoder().encode(JWT_SECRET);
    
    // Verify the token
    const { payload } = await jose.jwtVerify(token, secretKey);
    
    // Ensure userId is treated as an integer
    const verifiedPayload = { 
      ...payload as any,
      userId: parseInt((payload as any).userId.toString(), 10)
    } as SessionPayload;
    
    return verifiedPayload;
  } catch (err) {
    console.error('Error verifying auth token:', err);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // List of paths that DO NOT require authentication
  const publicPaths = [
    '/', // Splash page
    '/auth/error', // Error page
    '/api/auth/validate', // Auth validation endpoint itself
    '/api/health', // Health check endpoint
  ];

  // Check if the current path matches any of the public paths exactly or starts with it
  const isPublicPath = publicPaths.some(path => 
    pathname === path || pathname.startsWith(`${path}/`)
  );

  // Explicitly check for static assets and allow them
  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }

  // If it's a protected path, check for authentication
  if (!isPublicPath) {
    // Use request.cookies to get the session token
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      console.log('Middleware: No session token found, redirecting to /');
      return NextResponse.redirect(new URL('/', request.url));
    }

    const verifiedPayload = await verifyAuth(token);

    if (!verifiedPayload) {
      console.log('Middleware: Invalid session token, redirecting to /');
      // Delete the invalid cookie
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete(SESSION_COOKIE_NAME);
      return response;
    }

    // User is authenticated - we only have the userId at this point, not the display name
    console.log(`Middleware: User with ID ${verifiedPayload.userId} authenticated for path ${pathname}`);
    
    // Add userId to request headers for API routes
    // The display name would be fetched from the database in the component as needed
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', verifiedPayload.userId.toString());
    return NextResponse.next({ 
      request: { headers: requestHeaders } 
    });
  }

  // Allow the request to proceed for public paths
  return NextResponse.next();
}

// Enable the matcher configuration to specify which routes the middleware runs on
export const config = {
  matcher: [
    // Match all paths except static assets and specific excluded paths
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
