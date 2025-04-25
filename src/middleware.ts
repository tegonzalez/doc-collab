import { NextRequest, NextResponse } from 'next/server';
import * as jose from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'DEFAULT_VERY_SECRET_KEY_REPLACE_ME'; 
const SESSION_COOKIE_NAME = 'collabflow_session';

interface SessionPayload {
  userId: number; 
  iat?: number;
  exp?: number;
}

interface RawJWTPayload extends jose.JWTPayload {
    userId?: string | number;
}

// Function to verify JWT using jose
async function verifyAuth(token: string): Promise<SessionPayload | null> {
  try {
    const secretKey = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify<RawJWTPayload>(token, secretKey);

    if (payload.userId === undefined || payload.userId === null) {
      console.error('Token verification failed: userId missing in payload');
      return null;
    }

    const userIdInt = parseInt(payload.userId.toString(), 10);
    if (isNaN(userIdInt)) {
        console.error('Token verification failed: userId is not a valid number');
        return null;
    }

    const verifiedPayload: SessionPayload = {
      userId: userIdInt,
      iat: payload.iat,
      exp: payload.exp
    };
    
    return verifiedPayload;
  } catch (err: unknown) { 
    const message = err instanceof Error ? err.message : String(err);
    // Check for expired token specifically
    if (err instanceof jose.errors.JWTExpired) {
        console.log('Auth token expired: ' + message);
    } else {
        // Treat other errors as generic verification failures
        console.error('Error verifying auth token: ' + message);
    }
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicPaths = [
    '/', 
    '/auth/error', 
    '/api/auth/validate', 
    '/api/health', 
  ];

  if (pathname.startsWith('/_next') || pathname.includes('.') && !pathname.endsWith('.html')) { 
    return NextResponse.next();
  }
  
  const isPublicPath = publicPaths.some(path => 
    pathname === path || (path !== '/' && pathname.startsWith(path + '/')) 
  );

  if (!isPublicPath) {
    // --- START TEMPORARY BYPASS ---
    console.log(`TEMPORARY AUTH BYPASS: Assuming admin user (ID 1) for path: ${pathname}`);
    const adminUserId = '1';
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', adminUserId);
    return NextResponse.next({
      request: { headers: requestHeaders }
    });
    // --- END TEMPORARY BYPASS ---

    /* --- ORIGINAL AUTH LOGIC ---
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      console.log('Middleware: No session token, redirecting to /');
      return NextResponse.redirect(new URL('/', request.url));
    }

    const verifiedPayload = await verifyAuth(token);

    if (!verifiedPayload) {
      console.log('Middleware: Invalid/Expired session token, redirecting to /');
      const response = NextResponse.redirect(new URL('/', request.url));
      response.cookies.delete(SESSION_COOKIE_NAME); // Clear invalid cookie
      return response;
    }

    console.log(`Middleware: User ${verifiedPayload.userId} authenticated for path ${pathname}`);

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', verifiedPayload.userId.toString());
    return NextResponse.next({
      request: { headers: requestHeaders }
    });
    --- END ORIGINAL AUTH LOGIC --- */
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
