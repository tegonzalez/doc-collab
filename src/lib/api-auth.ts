import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth';

/**
 * API route handler with database-backed authentication
 * This handles proper token validation with app seed from database
 */
export async function withAuth<T>(
  request: NextRequest,
  handler: (userId: number, request: NextRequest) => Promise<T>
): Promise<T | NextResponse> {
  // Get the token from cookies
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Use the database-backed verification that checks app seed
    const session = await verifySessionToken(token);
    
    if (!session) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    // Call the handler with the authorized user ID
    return await handler(session.userId, request);
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
  }
} 