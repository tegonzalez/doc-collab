// src/lib/db/index.ts
// SQLite database interaction logic
import * as Sqlite from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Define the expected constructor type based on the .d.ts file
type SqliteConstructorType = new (path: string, options?: any) => Sqlite.Database;

// Initialize database connection
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'collabflow.db');

// Ensure the data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`Created data directory at ${dataDir}`);
}

// Type annotation using the imported namespace
let db: Sqlite.Database;

try {
  // Instantiate using the default export from the imported namespace,
  // with an explicit type assertion for the constructor.
  db = new (Sqlite.default as unknown as SqliteConstructorType)(DB_PATH);
  console.log(`SQLite database connected at ${DB_PATH}`);
} catch (error) {
  console.error('Failed to connect to SQLite database:', error);
  throw error;
}

// Initialize database schema if needed
const initializeSchema = () => {
  // Use the type from the namespace for prepare etc.
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
