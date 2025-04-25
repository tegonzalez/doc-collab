// scripts/generate-admin-link.ts
// Simple CLI script to generate an admin auth link for initial access.

import crypto from 'crypto';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import * as jose from 'jose';
// import dotenv from 'dotenv'; // No longer needed

// Setup for importing with ESM - MUST be defined before use
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Import shared environment loader (runs side effects to load env vars)
import '../src/lib/env';

// Import database module
import Database from 'better-sqlite3';

// Constants
const JWT_SECRET = process.env.JWT_SECRET; // Read directly from env

// Ensure JWT_SECRET is loaded
if (!JWT_SECRET) {
  console.error('CRITICAL: JWT_SECRET is not set in environment variables. Ensure security.env is configured.');
  process.exit(1);
}

// Ensure the database directory exists
const DB_PATH = process.env.COLLABFLOW_DB_PATH || path.join(process.cwd(), 'data', 'collabflow.db');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`Created data directory at ${dataDir}`);
}

// Connect to database
let db;
try {
  db = new Database(DB_PATH);
  console.log(`SQLite database connected at ${DB_PATH}`);
  
  // Enable foreign keys
  db.pragma('foreign_keys = ON');
} catch (error) {
  console.error('Failed to connect to SQLite database:', error);
  throw error;
}

// Generate a secure random token
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Format date to display in local timezone
const formatLocalDate = (date: Date): string => {
  return new Date(date).toLocaleString();
};

const main = async () => {
  try {
    // Get app seed from environment
    const appSeed = process.env.APP_SEED;
    if (!appSeed) {
      console.error('CRITICAL: APP_SEED is not set in environment variables. Ensure security.env is configured and db:reset-full was run.');
      process.exit(1);
    }
    // Log the full app seed for debugging
    console.log(`[GEN ADMIN LINK] Using app seed from environment: ${appSeed}`);

    // Define admin user ID
    const adminUserId = 1;

    // Check if admin user exists
    let existingUser = db.prepare('SELECT id FROM users WHERE id = ?').get(adminUserId);
    
    // If admin user doesn't exist, create it
    if (!existingUser) {
      console.log('Admin user not found. Creating default admin user with name "Admin"...');
      try {
        db.prepare('INSERT INTO users (id, display_name) VALUES (?, ?)').run(adminUserId, 'Admin');
        console.log('Default admin user created successfully.');
        existingUser = { id: adminUserId };
      } catch (error) {
        console.error('Failed to create admin user:', error);
        process.exit(1);
      }
    } else {
      console.log('Found admin user.');
    }

    // Log the secret being used (partially)
    const secretForLog = JWT_SECRET.length > 8 ? `${JWT_SECRET.substring(0, 4)}...${JWT_SECRET.substring(JWT_SECRET.length - 4)}` : 'SECRET_TOO_SHORT';
    console.log(`[GEN ADMIN LINK] Using JWT_SECRET for signing: ${secretForLog}`);
    
    // Generate JWT token
    const token = generateToken();
    
    // Create dates with 1 minute expiration
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMinutes(expiresAt.getMinutes() + 1);
    
    // Create JWT payload with jose
    const jwtPayload = {
      type: 'admin_link',
      userId: adminUserId,
      appSeed: appSeed,
    };
    
    // Sign token with jose
    const secretKey = new TextEncoder().encode(JWT_SECRET);
    const jwtToken = await new jose.SignJWT(jwtPayload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expiresAt.getTime() / 1000) // Convert to seconds for JWT
      .sign(secretKey);
    
    // Remove expired tokens - use current time in ISO format
    const currentTime = new Date().toISOString();
    db.prepare("DELETE FROM auth_tokens WHERE expires_at < ?").run(currentTime);
    
    // Store token in database - remove 'used' column as per delete-on-use strategy
    db.prepare('INSERT INTO auth_tokens (token, user_id, expires_at) VALUES (?, ?, ?)')
      .run(jwtToken, adminUserId, expiresAt.toISOString());
    
    // Generate link with the correct base URL
    const baseUrl = process.env.BASE_URL || 'http://localhost:9002'; // Update to your dev port
    const loginLink = `${baseUrl}/api/auth/validate?token=${encodeURIComponent(jwtToken)}`;
    
    // Display in local timezone for the admin
    console.log('\n--- Admin Login Link Generated ---');
    console.log(loginLink);
    console.log(`\nThis link will expire on: ${formatLocalDate(expiresAt)}`);
    console.log(`Current server time: ${formatLocalDate(now)}`);
    console.log('IMPORTANT: This link will expire in 1 minute and can only be used once.');
    
  } catch (error) {
    console.error('Error generating admin login link:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    if (db) {
      db.close();
    }
  }
};

main(); 