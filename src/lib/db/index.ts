// src/lib/db/index.ts
// SQLite database interaction logic
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Initialize database connection
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'collabflow.db');

// Ensure the data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`Created data directory at ${dataDir}`);
}

let db: Database.Database;

try {
  // Use type assertion to avoid constructor type issues
  db = new (Database as any)(DB_PATH);
  console.log(`SQLite database connected at ${DB_PATH}`);
} catch (error) {
  console.error('Failed to connect to SQLite database:', error);
  throw error;
}

// Initialize database schema if needed
const initializeSchema = () => {
  const userTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
  
  if (!userTableExists) {
    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        display_name TEXT,
        email TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ssh_keys TEXT
      );
      
      CREATE TABLE shared_links (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        path TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_by TEXT,
        expires_at TIMESTAMP,
        access_count INTEGER DEFAULT 0,
        FOREIGN KEY (created_by) REFERENCES users(id)
      );
    `);
    console.log('Database schema initialized');
  }
};

// Initialize schema on module import
initializeSchema();

export { db };

console.log("Placeholder: src/lib/db/index.ts loaded");
