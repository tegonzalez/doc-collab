import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Placeholder for JWT or other authentication logic
async function authenticateRequest(request: NextRequest) {
    const token = request.headers.get('authorization')?.split(' ')[1] || request.cookies.get('auth_token')?.value;

    // TODO: Implement actual JWT validation logic (Phase 1.3.1)
    // For now, allow all requests or block based on a simple check
    const isAuthenticated = !!token; // Dummy check

    if (request.nextUrl.pathname.startsWith('/api/admin') && !isAuthenticated) { // Example protected route
        // console.log('Blocked unauthenticated access to /api/admin');
        // return new Response('Unauthorized', { status: 401 });
    }

     // console.log(`Middleware: Path ${request.nextUrl.pathname}, Authenticated: ${isAuthenticated}`);
    return null; // Returning null allows the request to proceed if no response is returned
}


export async function middleware(request: NextRequest) {
    // Skip middleware for static files, images, etc., early
    if (request.nextUrl.pathname.startsWith('/_next/') ||
        request.nextUrl.pathname.includes('/api/health') || // Allow health check
        request.nextUrl.pathname.includes('/favicon.ico')) {
        return NextResponse.next();
    }

    // --- Authentication ---
    const authResponse = await authenticateRequest(request);
    if (authResponse) return authResponse;


    // --- Other Middleware Logic (Logging, Rate Limiting Placeholders) ---

    // TODO: Add logging (Phase 1.2.1.3)
    // console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`);

    // TODO: Add Rate Limiting (Phase 1.2.1.4) - requires external library or custom implementation

    // --- Security Headers (Phase 1.2.1.4) ---
    // Next.js adds some default headers. Additional headers can be set here or in next.config.js
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-request-id', crypto.randomUUID()); // Example header

    // Need to create a new response to modify headers for the *outgoing* request to the route
    // For *response* headers, modify NextResponse.next() response or use next.config.js
    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    // Add security headers to the response
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    // Content-Security-Policy is complex and better managed via next.config.js or a dedicated library

    return response;
}

// Configure which paths the middleware runs on
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes) - Apply middleware selectively within the function if needed
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * We will apply middleware logic inside the function based on pathname
         */
        // Run on all paths initially and filter inside the function
         '/((?!_next/static|_next/image|favicon.ico).*)',
         // Or be more specific:
        // '/settings/:path*',
        // '/dashboard/:path*',
        // '/api/((?!health).*)', // Apply to API routes except health
    ],
};
