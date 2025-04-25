// src/lib/db/schema.ts
// Database schema definitions for user settings and preferences

// App settings table for application-wide configuration
export const appSettingsTable = `
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

// Users table with comprehensive settings fields
export const usersTable = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_name TEXT NOT NULL UNIQUE,
  timezone TEXT DEFAULT 'UTC', -- IANA timezone identifier
  notification_settings TEXT DEFAULT '{"email":true,"ui":true}', -- JSON string for notification preferences
  ssh_keys TEXT, -- Newline-separated SSH public keys
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

// User emails (one user can have multiple emails, email optional)
export const userEmailsTable = `
CREATE TABLE IF NOT EXISTS user_emails (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   user_id INTEGER NOT NULL,
   email TEXT NOT NULL UNIQUE,
   is_primary BOOLEAN DEFAULT 0,
   verified BOOLEAN DEFAULT 0,
   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
   FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
`;

// Authentication tokens (for single-use links and persistent sessions)
export const authTokensTable = `
CREATE TABLE IF NOT EXISTS auth_tokens (
   token TEXT PRIMARY KEY, -- The unique token string (e.g., UUID for links, JWT for sessions)
   user_id INTEGER NOT NULL,
   expires_at DATETIME NOT NULL,
   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
   FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
`;

// Shared links for project access
export const linksTable = `
CREATE TABLE IF NOT EXISTS shared_links (
   id TEXT PRIMARY KEY, -- Unique link ID (for URL)
   user_id INTEGER NOT NULL, -- Link creator (owner)
   project_path TEXT NOT NULL, -- Path to the shared project/file
   permission_level TEXT NOT NULL, -- 'read', 'write', 'admin'
   created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
   expires_at DATETIME, -- Optional expiration date (NULL = never expires)
   FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
`;

// User activity audit log
export const userActivityTable = `
CREATE TABLE IF NOT EXISTS user_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  action_type TEXT NOT NULL, -- e.g., 'update_profile', 'add_ssh_key', 'update_email'
  details TEXT, -- JSON string with details of the action
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
`;

// SSH keys table for secure access control
export const userSshKeysTable = `
CREATE TABLE IF NOT EXISTS user_ssh_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  key_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`;

// SSH permissions table for fine-grained access control
export const sshPermissionsTable = `
CREATE TABLE IF NOT EXISTS ssh_permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  project_hash TEXT NOT NULL,
  permission_level TEXT NOT NULL CHECK(permission_level IN ('R', 'RW', 'RW+')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, project_hash),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`;

// Ensure updated_at is always set to current time when a row is updated
export const userUpdateTrigger = `
CREATE TRIGGER IF NOT EXISTS update_users_timestamp
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;
`;

// Ensure app_settings updated_at is set correctly
export const appSettingsUpdateTrigger = `
CREATE TRIGGER IF NOT EXISTS update_app_settings_timestamp
AFTER UPDATE ON app_settings
FOR EACH ROW
BEGIN
  UPDATE app_settings SET updated_at = CURRENT_TIMESTAMP WHERE key = OLD.key;
END;
`;

// Insert default app seed if it doesn't exist
export const insertDefaultAppSeed = `
INSERT OR IGNORE INTO app_settings (key, value) 
VALUES ('app_seed', lower(hex(randomblob(32))));
`;

console.log("Database schema definitions loaded");
