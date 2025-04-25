// src/lib/db/index.js
// SQLite database interaction logic
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

// Initialize database connection
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'collabflow.db');

// Ensure the data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`Created data directory at ${dataDir}`);
}

let db;

try {
  // Create database instance
  db = new Database(DB_PATH);
  console.log(`SQLite database connected at ${DB_PATH}`);
} catch (error) {
  console.error('Failed to connect to SQLite database:', error);
  throw error;
}

// Initialize database schema if needed
const initializeSchema = async () => {
  // Check if this is a fresh database (no users table)
  const userTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
  
  if (!userTableExists) {
    console.log('Creating initial database schema...');
    
    // Define the SQL schema without requiring the schema.ts file
    const usersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      display_name TEXT NOT NULL UNIQUE,
      timezone TEXT DEFAULT 'UTC',
      notification_settings TEXT DEFAULT '{"email":true,"ui":true}',
      ssh_keys TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`;
    
    const authTokensTable = `
    CREATE TABLE IF NOT EXISTS auth_tokens (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      used BOOLEAN DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );`;
    
    const linksTable = `
    CREATE TABLE IF NOT EXISTS shared_links (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      project_path TEXT NOT NULL,
      permission_level TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );`;
    
    const userUpdateTrigger = `
    CREATE TRIGGER IF NOT EXISTS update_users_timestamp
    AFTER UPDATE ON users
    BEGIN
      UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;`;
    
    // Execute initial schema creation
    db.exec(usersTable);
    db.exec(authTokensTable);
    db.exec(linksTable);
    db.exec(userUpdateTrigger);
    
    console.log('Base database schema initialized');
  }
  
  // Run migrations is handled externally by the migration scripts
};

// Run initialization
(async () => {
  await initializeSchema();
})().catch(err => {
  console.error('Database initialization failed:', err);
});

export { db };

console.log("Database module loaded"); 