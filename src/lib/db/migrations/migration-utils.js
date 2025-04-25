/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @next/next/no-assign-module-variable */
'use strict';

import { Umzug } from 'umzug';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { db } from '../index.js';

// Create migrations table if it doesn't exist
const createMigrationsTableIfNeeded = () => {
  console.log('Creating migrations table if needed');
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

// Create all tables manually to ensure app_settings is created
const createAppSettingsTable = () => {
  console.log('Manually creating app_settings table');
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Insert app seed if it doesn't exist
  const seedExists = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('app_seed');
  if (!seedExists) {
    console.log('Inserting app_seed');
    const appSeed = crypto.randomBytes(32).toString('hex');
    db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?)').run('app_seed', appSeed);
  }
  
  // Set up trigger
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_app_settings_timestamp
    AFTER UPDATE ON app_settings
    FOR EACH ROW
    BEGIN
      UPDATE app_settings SET updated_at = CURRENT_TIMESTAMP WHERE key = OLD.key;
    END;
  `);
};

// Umzug configuration
const migrationConfig = {
  migrations: {
    glob: 'src/lib/db/migrations/[0-9]*-*.{js,ts}',
    // Resolver function to get the migration content
    resolve: ({ name, path }) => {
      console.log(`Resolving migration: ${name} at path ${path}`);
      // Skip utility files
      if (path && !path.includes('migration-utils') && !path.includes('index')) {
        try {
          // Use dynamic import instead of require for ESM compatibility
          return {
            name,
            up: async () => {
              console.log(`Running migration up: ${name}`);
              try {
                // Use glob patterns with simpler migration approach
                if (path.endsWith('.js')) {
                  console.log(`Importing JS migration: ${path}`);
                  const module = await import(path);
                  if (module.up) {
                    await module.up(db);
                  } else if (module.default && module.default.up) {
                    await module.default.up(db);
                  }
                } else if (path.endsWith('.ts') && name === '001-schema') {
                  console.log('Applying consolidated schema migration...');
                  try {
                    console.log(`Importing TS schema migration: ${path}`);
                    const module = await import(path);
                    console.log('Module imported successfully:', Object.keys(module));
                    if (module.schemaMigration && module.schemaMigration.up) {
                      console.log('Found schemaMigration.up, executing...');
                      await module.schemaMigration.up();
                      console.log('Schema migration up completed');
                      
                      // Create app_settings table directly as a fallback
                      console.log('Creating app_settings directly as fallback');
                      createAppSettingsTable();
                    } else {
                      console.error('Schema migration module structure is incorrect');
                      console.error('Available exports:', Object.keys(module || {}));
                      
                      // Fallback - create app_settings table directly
                      createAppSettingsTable();
                    }
                  } catch (err) {
                    console.error('Error executing schema migration:', err);
                    
                    // Fallback - create app_settings table directly
                    createAppSettingsTable();
                  }
                }
              } catch (err) {
                console.error(`Error applying migration ${name}:`, err);
                
                // Fallback for app_settings if this is the schema migration
                if (name === '001-schema') {
                  createAppSettingsTable();
                }
              }
              
              // Record migration in the database
              console.log(`Recording migration ${name} in database`);
              const insertStmt = db.prepare('INSERT OR IGNORE INTO migrations (name) VALUES (?)');
              insertStmt.run(name);
            },
            down: async () => {
              console.log(`Running migration down: ${name}`);
              try {
                if (path.endsWith('.js')) {
                  const module = await import(path);
                  if (module.down) {
                    await module.down(db);
                  } else if (module.default && module.default.down) {
                    await module.default.down(db);
                  }
                } else if (path.endsWith('.ts') && name === '001-schema') {
                  console.log('Reverting consolidated schema migration...');
                  try {
                    const module = await import(path);
                    if (module.schemaMigration && module.schemaMigration.down) {
                      await module.schemaMigration.down();
                    } else {
                      console.error('Schema migration module structure is incorrect');
                      console.error('Available exports:', Object.keys(module || {}));
                    }
                  } catch (err) {
                    console.error('Error importing schema migration:', err);
                  }
                }
              } catch (err) {
                console.error(`Error reverting migration ${name}:`, err);
              }
              
              // Remove migration record from the database
              const deleteStmt = db.prepare('DELETE FROM migrations WHERE name = ?');
              deleteStmt.run(name);
            }
          };
        } catch (error) {
          console.warn(`Could not load migration at ${path}:`, error);
        }
      }
      return { name, up: async () => {}, down: async () => {} };
    }
  },
  storage: {
    // Use our own SQLite-based storage
    logMigration: async ({ name }) => {
      // This is handled in the resolver's up function
      console.log(`Logging migration: ${name}`);
    },
    unlogMigration: async ({ name }) => {
      // This is handled in the resolver's down function
      console.log(`Unlogging migration: ${name}`);
    },
    executed: async () => {
      try {
        // Get list of already executed migrations
        console.log('Checking executed migrations');
        const stmt = db.prepare('SELECT name FROM migrations ORDER BY executed_at');
        const rows = stmt.all();
        console.log(`Found ${rows.length} executed migrations`);
        return rows.map(row => row.name);
      } catch (error) {
        console.error('Error checking executed migrations:', error);
        // If the table doesn't exist yet, create it and return empty array
        createMigrationsTableIfNeeded();
        return [];
      }
    }
  },
  // Add required logger property
  logger: console
};

// Create an instance of the migrator
const migrator = new Umzug(migrationConfig);

// Create a new migration file
async function createMigration(name) {
  const timestamp = new Date().toISOString().replace(/[-:.]/g, '').split('T')[0];
  const filename = `${timestamp}-${name}.ts`;
  const migrationPath = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations', filename);
  
  // Migration template
  const template = `
import Database from 'better-sqlite3';

export const up = async (db: Database.Database) => {
  console.log('Running migration up: ${name}');
  
  // Your migration code here
  // db.exec(\`CREATE TABLE IF NOT EXISTS example (...)\`);
};

export const down = async (db: Database.Database) => {
  console.log('Running migration down: ${name}');
  
  // Your rollback code here
  // db.exec(\`DROP TABLE IF EXISTS example\`);
};
`;

  // Create the migration file
  fs.writeFileSync(migrationPath, template.trim());
  
  return filename;
}

// Run all pending migrations
async function runMigrations() {
  console.log('Running migrations');
  createMigrationsTableIfNeeded();
  
  // Run up migrations
  console.log('Calling migrator.up()');
  const result = await migrator.up();
  console.log('Migration result:', result);
  
  // Double check if app_settings exists
  try {
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='app_settings'").get();
    if (!tableExists) {
      console.log('app_settings table not found after migrations, creating directly');
      createAppSettingsTable();
    } else {
      console.log('app_settings table exists');
    }
  } catch (err) {
    console.error('Error checking app_settings table:', err);
  }
  
  return result;
}

// Revert the last migration
async function revertLastMigration() {
  createMigrationsTableIfNeeded();
  
  // Revert the last executed migration
  try {
    const result = await migrator.down({ to: '0' });
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error reverting migration:', error);
    return null;
  }
}

// List all migrations and their status
async function listMigrations() {
  createMigrationsTableIfNeeded();
  
  // Get executed migrations
  const executed = await migrator.storage.executed();
  
  // Get pending migrations
  const pending = (await migrator.pending()).map(m => m.name);
  
  return { executed, pending };
}

// Reset migrations tracking
async function resetMigrations() {
  let deletedCount = 0;
  
  try {
    // Check if migrations table exists
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='migrations'").get();
    
    if (tableExists) {
      // Delete all migration records
      const result = db.prepare('DELETE FROM migrations').run();
      deletedCount = result.changes;
    }
    
    return { success: true, deletedCount };
  } catch (error) {
    console.error('Error resetting migrations:', error);
    return { success: false, error, deletedCount };
  }
}

// Get all migration files in the migrations directory
async function getMigrationFiles() {
  const migrationsDir = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(file => 
      file.match(/^\d{8,14}-.*\.(js|ts)$/) && 
      !file.includes('migration-utils') && 
      !file.includes('index')
    )
    .sort();
  
  return files;
}

// Export all functions using ES Module syntax
export {
  createMigration,
  getMigrationFiles,
  runMigrations, 
  revertLastMigration,
  listMigrations,
  resetMigrations
}; 