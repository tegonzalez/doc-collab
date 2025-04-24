// src/lib/db/schema.ts
// Placeholder for database schema definitions (e.g., table creation SQL)

export const usersTable = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  hashed_password TEXT, -- For admin user
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

export const linksTable = `
CREATE TABLE IF NOT EXISTS shared_links (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  project_id TEXT NOT NULL,
  path TEXT NOT NULL,
  role TEXT CHECK(role IN ('read', 'contribute', 'edit')) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  created_by TEXT -- User ID or identifier
);
`;

// Add other necessary tables (config, etc.)

console.log("Placeholder: src/lib/db/schema.ts loaded");
