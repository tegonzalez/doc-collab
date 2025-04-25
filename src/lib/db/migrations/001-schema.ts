import { Migration } from '../types';
import { db } from "../index";
import crypto from 'crypto';

// Generate a secure application seed
const generateApplicationSeed = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Direct implementation functions
async function createAppSettingsTable() {
  console.log('Creating app_settings table');
  try {
    // First check if table exists to avoid errors
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='app_settings'").get();
    
    if (!tableExists) {
      // Create app_settings table
      db.exec(`
        CREATE TABLE app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Create trigger for updated_at
      db.exec(`
        CREATE TRIGGER IF NOT EXISTS update_app_settings_timestamp
        AFTER UPDATE ON app_settings
        FOR EACH ROW
        BEGIN
          UPDATE app_settings SET updated_at = CURRENT_TIMESTAMP WHERE key = OLD.key;
        END;
      `);
      
      console.log('app_settings table created successfully');
    } else {
      console.log('app_settings table already exists');
    }
    
    // Generate and store app seed if needed
    const seedExists = db.prepare('SELECT value FROM app_settings WHERE key = ?').get('app_seed');
    if (!seedExists) {
      const appSeed = generateApplicationSeed();
      db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?)').run('app_seed', appSeed);
      console.log('App seed generated and stored in database');
    } else {
      // App seed already exists, no need to try to update cache
      console.log('App seed already exists in database');
    }
  } catch (error) {
    console.error('Error creating app_settings table:', error);
    throw error;
  }
}

/**
 * Consolidated schema migration that contains the complete database schema.
 * This replaces individual migrations with a single definition of the current state.
 */
export const schemaMigration: Migration = {
  name: '001-schema',
  
  async up() {
    console.log('Applying consolidated schema migration');
    
    try {
      // Create all tables in the correct order
      
      // App settings table first since other tables might need it
      await createAppSettingsTable();

      // Users table
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          display_name TEXT NOT NULL,
          timezone TEXT DEFAULT 'UTC', 
          notification_settings TEXT DEFAULT '{"email":true,"ui":true}',
          ssh_keys TEXT,
          preferred_language TEXT DEFAULT 'en-US',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Create default admin user if not exists
      const adminExists = db.prepare('SELECT id FROM users WHERE id = 1').get();
      if (!adminExists) {
        db.prepare('INSERT INTO users (id, display_name) VALUES (?, ?)').run(1, 'Administrator');
        console.log('Default administrator user created');
      }
      
      // User emails table
      db.exec(`
        CREATE TABLE IF NOT EXISTS user_emails (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          email TEXT NOT NULL UNIQUE,
          is_primary BOOLEAN DEFAULT 0,
          verified BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );
      `);
      
      // Authentication tokens table
      db.exec(`
        CREATE TABLE IF NOT EXISTS auth_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          token TEXT NOT NULL UNIQUE,
          user_id INTEGER NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('link', 'session')),
          expires_at DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );
      `);
      
      // SSH keys table
      db.exec(`
        CREATE TABLE IF NOT EXISTS ssh_keys (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          key_name TEXT,
          key_value TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );
      `);

      // User preferences table
      db.exec(`
        CREATE TABLE IF NOT EXISTS user_preferences (
          user_id INTEGER PRIMARY KEY,
          theme TEXT NOT NULL DEFAULT 'system',
          editor_font_size INTEGER NOT NULL DEFAULT 14,
          editor_font_family TEXT NOT NULL DEFAULT 'monospace',
          editor_tab_size INTEGER NOT NULL DEFAULT 2,
          editor_line_wrapping BOOLEAN NOT NULL DEFAULT 1,
          editor_auto_save BOOLEAN NOT NULL DEFAULT 1,
          editor_key_bindings TEXT NOT NULL DEFAULT 'default',
          ui_density TEXT NOT NULL DEFAULT 'comfortable',
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
      
      // Shared links table
      db.exec(`
        CREATE TABLE IF NOT EXISTS shared_links (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          project_id TEXT NOT NULL,
          token TEXT NOT NULL UNIQUE,
          expires_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );
      `);
      
      // User activity audit log
      db.exec(`
        CREATE TABLE IF NOT EXISTS user_activity (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          activity_type TEXT NOT NULL,
          details TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        );
      `);
      
      // Create user_ssh_keys table for SSH key access control
      db.exec(`
        CREATE TABLE IF NOT EXISTS user_ssh_keys (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          key_id TEXT NOT NULL UNIQUE,
          public_key TEXT NOT NULL,
          name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
      
      // Create SSH permissions table for fine-grained access control
      db.exec(`
        CREATE TABLE IF NOT EXISTS ssh_permissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          project_hash TEXT NOT NULL,
          permission_level TEXT NOT NULL CHECK(permission_level IN ('R', 'RW', 'RW+')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, project_hash),
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
      
      // Create triggers for updated_at timestamps
      db.exec(`
        CREATE TRIGGER IF NOT EXISTS update_users_timestamp
        AFTER UPDATE ON users
        FOR EACH ROW
        BEGIN
          UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
        END;
      `);
      
      // Double check if the app_settings table was created correctly
      const appSettingsExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='app_settings'").get();
      if (!appSettingsExists) {
        console.log('app_settings table not created in initial run, retrying...');
        await createAppSettingsTable();
      }
      
      console.log('Consolidated schema migration applied successfully');
    } catch (error) {
      console.error('Error in schema migration:', error);
      throw error;
    }
  },
  
  async down() {
    console.log('Reverting consolidated schema migration');
    
    try {
      // Drop tables in reverse order to respect foreign key constraints
      db.exec('DROP TABLE IF EXISTS ssh_permissions;');
      db.exec('DROP TABLE IF EXISTS user_ssh_keys;');
      db.exec('DROP TABLE IF EXISTS user_activity;');
      db.exec('DROP TABLE IF EXISTS shared_links;');
      db.exec('DROP TABLE IF EXISTS user_preferences;');
      db.exec('DROP TABLE IF EXISTS ssh_keys;');
      db.exec('DROP TABLE IF EXISTS auth_tokens;');
      db.exec('DROP TABLE IF EXISTS user_emails;');
      db.exec('DROP TABLE IF EXISTS users;');
      db.exec('DROP TABLE IF EXISTS app_settings;');
      
      console.log('Consolidated schema migration reverted successfully');
    } catch (error) {
      console.error('Error reverting schema migration:', error);
      throw error;
    }
  }
}; 