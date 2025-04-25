// scripts/generate-admin-link.mjs
// Simple CLI script to generate an admin auth link for initial access.

import crypto from 'crypto';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import * as jose from 'jose';

// Setup for importing with ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Import database module
import Database from 'better-sqlite3';

// Ensure the database directory exists
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'collabflow.db');
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
} catch (error) {
  console.error('Failed to connect to SQLite database:', error);
  throw error;
}

// Generate a secure random token
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Format date to display in local timezone
const formatLocalDate = (date) => {
  return new Date(date).toLocaleString();
};

const main = async () => {
  try {
    // Create auth_tokens table if it doesn't exist
    const authTokensTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='auth_tokens'").get();
    if (!authTokensTableExists) {
      console.log('Creating auth_tokens table...');
      db.exec(`
        CREATE TABLE auth_tokens (
          token TEXT PRIMARY KEY,
          user_id INTEGER,
          type TEXT,
          expires_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Auth tokens table created.');
    }

    // Define admin user 
    const adminUserId = 1; // Integer ID - explicitly use a number
    const adminDisplayName = 'Admin';

    // Check if users table exists and create if needed
    const usersTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
    if (!usersTableExists) {
      console.log('Creating users table...');
      db.exec(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY,
          display_name TEXT,
          email TEXT UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          ssh_keys TEXT
        );
      `);
      console.log('Users table created.');
    }

    // Check if admin user already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE id = ?').get(adminUserId);
    
    if (!existingUser) {
      // Create admin user if it doesn't exist
      console.log(`Creating admin user (ID: ${adminUserId}, Name: ${adminDisplayName})...`);
      db.prepare('INSERT INTO users (id, display_name) VALUES (?, ?)').run(adminUserId, adminDisplayName);
      console.log('Admin user created.');
    } else {
      console.log('Admin user already exists.');
    }

    // Generate auth token
    const token = generateToken();
    
    // Create dates in UTC
    const now = new Date();
    const expiresAt = new Date(now);
    // Set expiration to 1 minute for admin links (for security)
    expiresAt.setMinutes(expiresAt.getMinutes() + 1);
    
    // Store token in database with UTC timestamp
    // Ensure adminUserId is passed as an integer
    db.prepare('INSERT INTO auth_tokens (token, user_id, type, expires_at) VALUES (?, ?, ?, ?)').run(
      token, 
      adminUserId, // Ensure this is a number, not a string or float 
      'link', 
      expiresAt.toISOString() // Store date in ISO format (UTC)
    );
    
    // Generate link
    const baseUrl = process.env.BASE_URL || 'http://localhost:9002'; // Update to your dev port
    const loginLink = `${baseUrl}/api/auth/validate?token=${token}`;
    
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