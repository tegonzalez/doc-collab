// src/lib/db/schema.ts
// Placeholder for database schema definitions (e.g., table creation SQL)

// Users table (no password, ID focus)
export const usersTable = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_name TEXT NOT NULL UNIQUE,
  -- Removed password_hash
  -- email is stored in user_emails table
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

// User emails (one user can have multiple emails, email optional)
export const userEmailsTable = `
CREATE TABLE IF NOT EXISTS user_emails (
    user_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    PRIMARY KEY (user_id, email),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
`;

// Authentication tokens (for single-use links and persistent sessions)
export const authTokensTable = `
CREATE TABLE IF NOT EXISTS auth_tokens (
    token TEXT PRIMARY KEY, -- The unique token string (e.g., UUID for links, JWT for sessions? Or opaque)
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('link', 'session')), -- 'link' for one-time use, 'session' for cookie
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);
`;

// Shared links for read-only access (token-based)
export const linksTable = `
CREATE TABLE IF NOT EXISTS shared_links (
  token TEXT PRIMARY KEY, -- The unique shareable token (distinct from auth tokens)
  project_path TEXT NOT NULL,
  permissions TEXT NOT NULL DEFAULT 'read-only',
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

// Add other necessary tables (config, etc.)

console.log("Placeholder: src/lib/db/schema.ts loaded");
