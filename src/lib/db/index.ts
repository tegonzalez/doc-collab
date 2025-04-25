// src/lib/db/index.ts
// SQLite database interaction logic

import path from 'path';
import fs from 'fs';
// Import better-sqlite3 and handle potential default/named export inconsistencies
import BSQL3 from 'better-sqlite3';
const Database = (BSQL3 as any).Database || BSQL3; // Adjust type assertion if needed

// Keep original minimal types for now
type PreparedStatement = {
  get: (...params: any[]) => any; 
  all: (...params: any[]) => any[];
  run: (...params: any[]) => any;
};
type DatabaseLike = {
  prepare: (sql: string) => PreparedStatement;
  exec: (sql: string) => void;
  pragma: (pragma: string) => void;
  close: () => void;
};

// NOTE: isEdgeRuntime checks are removed as the goal is Node.js only where DB is needed.
// Runtime constraints are handled by Next.js config and route segment configs.

// Get the database path from environment variables or use the default
const DB_PATH = process.env.COLLABFLOW_DB_PATH || './data/collabflow.db';

// Ensure database directory exists
const ensureDatabaseDirectoryExists = () => {
  const dbDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`Created database directory: ${dbDir}`);
  }
};

// Define the initialize schema function first before it's used
// Initialize database schema if needed
const initializeSchema = async (database: /* Use resolved type */ BSQL3.Database) => {
  // Check if this is a fresh database
  const tablesExist = database.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").get();
  
  if (tablesExist.count === 0) {
    console.log('Creating initial database schema...');
    // Dynamically import schema when needed
    const schema = await import('./schema');
    
    // Create migrations table first
    database.exec(`
      CREATE TABLE migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Execute initial schema creation
    database.exec(schema.usersTable);
    database.exec(schema.userEmailsTable);
    database.exec(schema.authTokensTable);
    database.exec(schema.linksTable);
    database.exec(schema.userActivityTable);
    database.exec(schema.userUpdateTrigger);
    
    // Add app_settings table and SSH-related tables
    database.exec(schema.appSettingsTable);
    database.exec(schema.appSettingsUpdateTrigger);
    database.exec(schema.userSshKeysTable);
    database.exec(schema.sshPermissionsTable);
    
    // Insert default app seed
    database.exec(schema.insertDefaultAppSeed);
    
    console.log('Database schema initialized');
  }
  
  // Run migrations
  try {
    const { initializeMigrations } = await import('./migrations/runner');
    await initializeMigrations();
    console.log('Database migrations applied successfully');
  } catch (error) {
    console.error('Error applying migrations:', error);
  }
};

// Create or connect to the SQLite database
const connectToDatabase = (): /* Use resolved type */ BSQL3.Database => {
  try {
    ensureDatabaseDirectoryExists();
    
    // Use the resolved Database constructor
    const database = new Database(DB_PATH);
    console.log(`Connected to SQLite database at ${DB_PATH}`);
    
    // Enable foreign keys and WAL mode
    database.pragma('foreign_keys = ON');
    database.pragma('journal_mode = WAL'); 
    
    return database;
  } catch (error) {
    console.error('Error connecting to database:', error);
    throw error;
  }
};

// Create a database connection
// This is a singleton instance that will be reused across the application
let _db: /* Use resolved type */ BSQL3.Database | null = null;

// Exported getter function with lazy initialization
export const getDB = (): /* Use resolved type */ BSQL3.Database => {
  if (!_db) {
    console.log('Initializing database connection...');
    _db = connectToDatabase();
    
    // Initialize schema if needed (first run)
    // Use a flag to prevent migrations from running during auth flow
    // Use unknown for global type safety
    const isAuthFlow = process.env.NEXT_PHASE === 'phase-production-build' || 
                       (typeof global !== 'undefined' && (global as unknown as { IS_AUTH_FLOW?: boolean }).IS_AUTH_FLOW === true);
    
    // If it's an auth flow, don't run migrations
    if (!isAuthFlow) {
      // Run the initialization without awaiting it
      Promise.resolve().then(() => initializeSchema(_db as BSQL3.Database))
        .catch(err => {
          console.error('Error initializing schema:', err);
        });
    } else {
      console.log('Skipping schema initialization during auth flow');
    }
  }
  return _db;
};

// Initialize the database and export it
export const db = getDB();

console.log("Database module loaded");

// Explicitly run migrations during server startup
// But only in development mode
if (process.env.NODE_ENV === 'development') {
  console.log("Running database migrations during server startup...");
  Promise.resolve().then(async () => {
    try {
      // Ensure getDB() is called to initialize connection before migrations
      getDB();
      const { initializeMigrations } = await import('./migrations/runner');
      await initializeMigrations();
      console.log("Database migrations completed during startup");
    } catch (error: unknown) { // Fix any type in catch
      const message = error instanceof Error ? error.message : String(error);
      console.error("Failed to run migrations during startup:", message);
    }
  });
}

export default db;
