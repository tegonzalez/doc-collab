import jwt from 'jsonwebtoken'; // Revert import

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h'; // Default to 1 hour

if (!JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET is not defined in environment variables.');
  // In a real application, you might want to exit or throw a more specific error
  // For development, we might use a default, but this is insecure for production.
  // throw new Error('JWT_SECRET must be set');
  // For now, let's log the error and continue, expecting it might fail later.
}

interface JwtPayload {
  userId: number;
  // Add other relevant payload fields like username, roles, etc.
}

/**
 * Generates a JWT token for a given user payload.
 * @param payload - The data to include in the token.
 * @returns The generated JWT token.
 * @throws Error if JWT_SECRET is not set.
 */
export function generateToken(payload: JwtPayload): string {
  if (!JWT_SECRET) {
    throw new Error('JWT secret key is not configured.');
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verifies a JWT token and returns its payload.
 * @param token - The JWT token to verify.
 * @returns The decoded payload if the token is valid.
 * @throws Error if the token is invalid, expired, or the secret is missing.
 */
export function verifyToken(token: string): JwtPayload {
  if (!JWT_SECRET) {
    throw new Error('JWT secret key is not configured.');
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // You might want to add more validation here if needed
    return decoded as JwtPayload;
  } catch (error) {
    // Use type assertion to access error properties safely
    const errorAsError = error as Error; // Assert error type once
    console.error('JWT Verification Error:', errorAsError.message);
    
    // Check error type using the name property
    if (errorAsError.name === 'JsonWebTokenError') {
      throw new Error(`Invalid token: ${errorAsError.message}`);
    } else if (errorAsError.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    // Fallback for other potential errors
    throw new Error('Failed to verify token: ' + errorAsError.message);
  }
}

// Example Usage (demonstration purposes, remove or adapt for actual use):
/*
try {
  // Example: Generate a token
  const userId = 123;
  const token = generateToken({ userId });
  console.log('Generated Token:', token);

  // Example: Verify the token
  const decodedPayload = verifyToken(token);
  console.log('Verified Payload:', decodedPayload);

  // Example: Verify an invalid token (simulate tampering)
  try {
    verifyToken(token + 'invalid');
  } catch (e) {
    console.error('Verification failed for tampered token:', (e as Error).message);
  }

  // Example: Verify an expired token (requires manipulating expiry or waiting)
  // const expiredToken = jwt.sign({ userId: 456 }, JWT_SECRET!, { expiresIn: '-1s' });
  // try {
  //   verifyToken(expiredToken);
  // } catch (e) {
  //   console.error('Verification failed for expired token:', (e as Error).message);
  // }

} catch (error) {
  console.error('Error in JWT operations:', (error as Error).message);
}
*/
