import { NextRequest } from 'next/server';
// Import db directly to avoid initialization issues
import { db } from './db';
import * as jose from 'jose';
import crypto from 'crypto';

// Import the environment loader to ensure variables are loaded
import './env'; 

/**
 * Session data interface
 */
export interface Session {
  userId: string;
  email?: string;
  displayName?: string;
  iat: number;
  exp: number;
}

/**
 * Get the application seed from the environment variables.
 * This is critical for security as it allows invalidating all tokens if the app seed changes.
 */
export function getAppSeed(): string {
  const seed = process.env.APP_SEED;
  if (!seed) {
    // This is a critical error - application cannot function securely without a proper seed
    console.error('CRITICAL: APP_SEED is not defined in environment variables!');
    throw new Error('APP_SEED environment variable is required for secure operations');
  }
  return seed;
}

/**
 * Validate if a seed value matches the current application seed from the environment.
 * This ensures tokens are invalidated if the application seed changes.
 */
export function validateAppSeed(seedValue: string): boolean {
  try {
    const currentAppSeed = getAppSeed();
    // Add logging for debugging purposes
    console.log(`Validating token seed: ${seedValue} against current env seed: ${currentAppSeed}`);
    return currentAppSeed === seedValue;
  } catch (error) {
    // getAppSeed should handle its own errors, but catch just in case
    console.error('Error during app seed validation:', error);
    return false;
  }
}

/**
 * Validate a user session from a request
 * 
 * @param request The Next.js request object
 * @returns The session data if valid, null otherwise
 */
export async function validateSession(request: NextRequest): Promise<Session | null> {
  try {
    // Get the token from the Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.substring(7);
    if (!token) {
      return null;
    }
    
    // Get the secret from environment variables
    const jwtSecret = process.env.JWT_SECRET; // Rely solely on env var now
    if (!jwtSecret) {
      console.error('CRITICAL: JWT_SECRET not set in environment variables!');
      return null; // Cannot validate without secret
    }
    
    // Verify the token using jose instead of jsonwebtoken
    const secretKey = new TextEncoder().encode(jwtSecret);
    const { payload } = await jose.jwtVerify(token, secretKey);
    
    // Convert to proper session payload
    const session = payload as unknown as Session;
    
    // Check if the token is expired
    if (session.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return session;
  } catch (error) {
    return null;
  }
}

/**
 * Generate a new JWT token for a user using jose
 * 
 * @param userId The user ID to include in the token
 * @param email Optional user email to include in the token
 * @param displayName Optional user display name to include in the token
 * @returns The generated JWT token
 */
export async function generateToken(
  userId: string, 
  email?: string, 
  displayName?: string
): Promise<string> {
  // Get the secret from environment variables
  const jwtSecret = process.env.JWT_SECRET; // Rely solely on env var now
  if (!jwtSecret) {
    console.error('CRITICAL: JWT_SECRET not set in environment variables!');
    throw new Error('JWT_SECRET not set in environment variables');
  }
  
  // Set token expiration time (e.g., 7 days)
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  // Convert expiration string to seconds
  const expirationSeconds = typeof expiresIn === 'string' && expiresIn.endsWith('d')
    ? parseInt(expiresIn.slice(0, -1), 10) * 24 * 60 * 60
    : 7 * 24 * 60 * 60; // Default to 7 days
  
  // Create the payload
  const payload: Omit<Session, 'iat' | 'exp'> = {
    userId,
    ...(email && { email }),
    ...(displayName && { displayName })
  };
  
  // Generate and return the token using jose
  const secretKey = new TextEncoder().encode(jwtSecret);
  const token = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + expirationSeconds)
    .sign(secretKey);
  
  return token;
}

export const SESSION_COOKIE_NAME = 'collabflow_session';
const PERMANENT_COOKIE_MAX_AGE = 10 * 365 * 24 * 60 * 60; // 10 years in seconds

// Create a new session token for a user
export async function createSessionToken(userId: number): Promise<string> {
  try {
    // Never trust user input directly for security operations
    // Verify the user exists
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) {
      throw new Error(`User not found with ID: ${userId}`);
    }
    
    // Get application seed - required for security
    const appSeed = getAppSeed(); // Reads from env now
    
    // Create session JWT with the application seed
    const payload = {
      userId: userId,
      appSeed: appSeed,
      type: 'session'
    };
    
    // Sign the token
    const jwtSecret = process.env.JWT_SECRET; // Rely solely on env var now
    if (!jwtSecret) {
      console.error('CRITICAL: JWT_SECRET not set in environment variables!');
      throw new Error('JWT_SECRET not set in environment variables');
    }
    const secretKey = new TextEncoder().encode(jwtSecret);
    const token = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .sign(secretKey);
    
    // Store the session token in the database
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setFullYear(now.getFullYear() + 10); // 10 years expiration
    
    // Insert the token using the actual schema (without 'type' column)
    db.prepare('INSERT INTO auth_tokens (token, user_id, expires_at) VALUES (?, ?, ?)')
      .run(token, userId, expiresAt.toISOString());
    console.log(`[Auth] Session token stored in database for user ${userId}`);
    
    return token;
  } catch (error) {
    console.error('[Auth] Error creating session token:', error);
    throw error;
  }
}

// Verify a session token
export async function verifySessionToken(token: string): Promise<{ userId: number } | null> {
  try {
    // Verify JWT signature
    const jwtSecret = process.env.JWT_SECRET; // Rely solely on env var now
    if (!jwtSecret) {
      console.error('CRITICAL: JWT_SECRET not set in environment variables!');
      return null;
    }
    const secretKey = new TextEncoder().encode(jwtSecret);
    let payload;
    try {
      const verifyResult = await jose.jwtVerify(token, secretKey);
      payload = verifyResult.payload;
    } catch (jwtError) {
      console.error('🔑 Auth: JWT verification failed:', jwtError);
      return null;
    }
    
    // Convert to proper session payload
    const sessionPayload = payload as unknown as { 
      userId: number; 
      appSeed: string;
      type: string;
    };
    
    // Validate token type from JWT payload
    if (!sessionPayload.type || sessionPayload.type !== 'session') {
      console.error('🔑 Auth: Invalid token type:', sessionPayload.type);
      return null;
    }
    
    // Ensure userId is an integer
    const userId = parseInt(sessionPayload.userId.toString(), 10);
    if (isNaN(userId) || userId <= 0) {
      console.error('🔑 Auth: Invalid userId in token:', sessionPayload.userId);
      return null;
    }
    
    // Check app seed against cached seed
    try {
      if (!validateAppSeed(sessionPayload.appSeed)) {
        console.error('🔑 Auth: App seed mismatch');
        return null;
      }
    } catch (seedError) {
      console.error('🔑 Auth: App seed validation error:', seedError);
      return null;
    }
    
    // Verify token exists in database
    try {
      const tokenRecord = db.prepare('SELECT user_id FROM auth_tokens WHERE token = ?').get(token);
      
      if (!tokenRecord) {
        console.error('🔑 Auth: Token not found in database');
        return null;
      }
      
      // Verify the user ID in the database matches the one in the token
      const dbUserId = parseInt(tokenRecord.user_id.toString(), 10);
      if (dbUserId !== userId) {
        console.error(`🔑 Auth: User ID mismatch: token=${userId}, db=${dbUserId}`);
        return null;
      }
      
      return { userId };
    } catch (dbError) {
      console.error('🔑 Auth: Database token verification error:', dbError);
      return null;
    }
  } catch (error) {
    console.error('🔑 Auth: Token verification failed:', error);
    return null;
  }
}

// Export constants
export { PERMANENT_COOKIE_MAX_AGE }; 