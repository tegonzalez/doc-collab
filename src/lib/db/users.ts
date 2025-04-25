// src/lib/db/users.ts
// User settings database operations

import { db } from './index';

// User settings interfaces
export interface UserSettings {
  id: number;
  displayName: string;
  timezone: string;
  notificationSettings: NotificationSettings;
  sshKeys: SshKey[];
  emails: UserEmail[];
  createdAt: string;
  updatedAt: string;
}

export interface NotificationSettings {
  email: boolean;
  ui: boolean;
}

export interface UserEmail {
  id?: number;
  email: string;
  isPrimary: boolean;
  verified: boolean;
}

export interface SshKey {
  id?: number;
  name: string | null;
  value: string;
  createdAt: string;
}

// Get user by ID with all their settings
export function getUserById(userId: number): UserSettings | null {
  try {
    // Get the basic user information
    const user = db.prepare(`
      SELECT id, display_name, timezone, notification_settings, created_at, updated_at
      FROM users
      WHERE id = ?
    `).get(userId);
    
    if (!user) {
      console.warn(`User with ID ${userId} not found`);
      return null;
    }
    
    // Parse notification settings
    let notificationSettings: NotificationSettings;
    try {
      notificationSettings = JSON.parse(user.notification_settings || '{}');
    } catch (e) {
      console.warn(`Failed to parse notification settings for user ${userId}, using defaults`);
      notificationSettings = { email: true, ui: true };
    }
    
    // Get SSH keys
    const sshKeys = db.prepare(`
      SELECT id, key_name as name, key_value as value, created_at
      FROM ssh_keys
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId);
    
    // Get emails
    const emails = db.prepare(`
      SELECT id, email, is_primary, verified
      FROM user_emails
      WHERE user_id = ?
      ORDER BY is_primary DESC, created_at ASC
    `).all(userId);
    
    return {
      id: user.id,
      displayName: user.display_name,
      timezone: user.timezone || 'UTC',
      notificationSettings,
      sshKeys,
      emails: emails.map((email: any) => ({
        id: email.id,
        email: email.email,
        isPrimary: !!email.is_primary,
        verified: !!email.verified
      })),
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  } catch (error) {
    console.error('Error getting user settings:', error);
    throw error;
  }
}

// Update user display name
export function updateDisplayName(userId: number, displayName: string): boolean {
  try {
    // Validate display name
    if (!displayName || displayName.trim().length === 0) {
      throw new Error('Display name cannot be empty');
    }
    
    // Check for uniqueness
    const existingUser = db.prepare('SELECT id FROM users WHERE display_name = ? AND id != ?')
      .get(displayName, userId);
      
    if (existingUser) {
      throw new Error('Display name is already taken');
    }
    
    // Update user
    const result = db.prepare('UPDATE users SET display_name = ? WHERE id = ?')
      .run(displayName, userId);
      
    // Log activity
    logUserActivity(userId, 'update_display_name', { displayName });
    
    return result.changes > 0;
  } catch (error) {
    console.error('Error updating display name:', error);
    throw error;
  }
}

// Update user timezone
export function updateTimezone(userId: number, timezone: string): boolean {
  try {
    // Validate timezone (basic check - should be more comprehensive in production)
    if (!timezone || timezone.trim().length === 0) {
      throw new Error('Timezone cannot be empty');
    }
    
    // Update user
    const result = db.prepare('UPDATE users SET timezone = ? WHERE id = ?')
      .run(timezone, userId);
      
    // Log activity
    logUserActivity(userId, 'update_timezone', { timezone });
    
    return result.changes > 0;
  } catch (error) {
    console.error('Error updating timezone:', error);
    throw error;
  }
}

// Update notification settings
export function updateNotificationSettings(
  userId: number, 
  settings: NotificationSettings
): boolean {
  try {
    // Validate settings
    if (typeof settings !== 'object' || settings === null) {
      throw new Error('Invalid notification settings');
    }
    
    // Convert to JSON string
    const settingsJson = JSON.stringify(settings);
    
    // Update user
    const result = db.prepare('UPDATE users SET notification_settings = ? WHERE id = ?')
      .run(settingsJson, userId);
      
    // Log activity
    logUserActivity(userId, 'update_notification_settings', settings);
    
    return result.changes > 0;
  } catch (error) {
    console.error('Error updating notification settings:', error);
    throw error;
  }
}

// Update SSH keys (legacy method for backward compatibility)
export function updateSshKeys(userId: number, sshKeys: string[]): boolean {
  try {
    // Handle the migration case - we need to check if the new table exists
    let useNewTable = false;
    
    try {
      db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ssh_keys'").get();
      useNewTable = true;
    } catch (e) {
      // Table doesn't exist yet, use the old approach
    }
    
    if (useNewTable) {
      // New approach: manage keys in the dedicated table
      return updateSshKeysInTable(userId, sshKeys);
    } else {
      // Legacy approach: store as newline-separated string
      return updateSshKeysLegacy(userId, sshKeys);
    }
  } catch (error) {
    console.error('Error updating SSH keys:', error);
    throw error;
  }
}

// Update SSH keys in the dedicated table
function updateSshKeysInTable(userId: number, sshKeys: string[]): boolean {
  // Validate SSH keys
  for (const key of sshKeys) {
    if (!validateSshKey(key)) {
      throw new Error(`Invalid SSH key format: ${key.substring(0, 20)}...`);
    }
  }
  
  // Start transaction
  db.prepare('BEGIN').run();
  
  try {
    // Delete all existing keys for this user
    db.prepare('DELETE FROM ssh_keys WHERE user_id = ?').run(userId);
    
    // Insert new keys
    const insertKey = db.prepare('INSERT INTO ssh_keys (user_id, key_value) VALUES (?, ?)');
    
    for (const key of sshKeys) {
      insertKey.run(userId, key.trim());
    }
    
    // Also update the legacy column for backward compatibility
    const keysString = sshKeys.join('\n');
    db.prepare('UPDATE users SET ssh_keys = ? WHERE id = ?').run(keysString, userId);
    
    // Commit transaction
    db.prepare('COMMIT').run();
    
    // Log activity
    logUserActivity(userId, 'update_ssh_keys', { keyCount: sshKeys.length });
    
    return true;
  } catch (error) {
    // Rollback on error
    db.prepare('ROLLBACK').run();
    console.error('Error updating SSH keys in table:', error);
    throw error;
  }
}

// Update SSH keys using the legacy approach
function updateSshKeysLegacy(userId: number, sshKeys: string[]): boolean {
  // Validate SSH keys
  for (const key of sshKeys) {
    if (!validateSshKey(key)) {
      throw new Error(`Invalid SSH key format: ${key.substring(0, 20)}...`);
    }
  }
  
  // Join keys with newlines
  const keysString = sshKeys.join('\n');
  
  // Update user
  const result = db.prepare('UPDATE users SET ssh_keys = ? WHERE id = ?')
    .run(keysString, userId);
    
  // Log activity
  logUserActivity(userId, 'update_ssh_keys', { keyCount: sshKeys.length });
  
  return result.changes > 0;
}

// Add a new SSH key (new method for individual key management)
export function addSshKey(userId: number, keyValue: string, keyName: string | null = null): number {
  try {
    // Validate SSH key
    if (!validateSshKey(keyValue)) {
      throw new Error(`Invalid SSH key format: ${keyValue.substring(0, 20)}...`);
    }
    
    // Check if table exists
    let tableExists = false;
    try {
      const result = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ssh_keys'").get();
      tableExists = !!result;
    } catch (e) {
      // Table doesn't exist
    }
    
    if (!tableExists) {
      throw new Error('SSH keys table not available. Run migrations first.');
    }
    
    // Insert the new key
    const result = db.prepare(
      'INSERT INTO ssh_keys (user_id, key_name, key_value) VALUES (?, ?, ?)'
    ).run(userId, keyName, keyValue.trim());
    
    // Update legacy column for backward compatibility
    const user = getUserById(userId);
    if (user) {
      const allKeys = user.sshKeys.map(k => k.value);
      allKeys.push(keyValue.trim());
      
      db.prepare('UPDATE users SET ssh_keys = ? WHERE id = ?')
        .run(allKeys.join('\n'), userId);
    }
    
    // Log activity
    logUserActivity(userId, 'add_ssh_key', { keyName });
    
    return result.lastInsertRowid as number;
  } catch (error) {
    console.error('Error adding SSH key:', error);
    throw error;
  }
}

// Update an SSH key (rename)
export function updateSshKey(userId: number, keyId: number, keyName: string): boolean {
  try {
    // Check if table exists
    let tableExists = false;
    try {
      const result = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ssh_keys'").get();
      tableExists = !!result;
    } catch (e) {
      // Table doesn't exist
    }
    
    if (!tableExists) {
      throw new Error('SSH keys table not available. Run migrations first.');
    }
    
    // Verify key belongs to user
    const key = db.prepare('SELECT * FROM ssh_keys WHERE id = ? AND user_id = ?')
      .get(keyId, userId);
      
    if (!key) {
      throw new Error('SSH key not found or does not belong to user');
    }
    
    // Update the key name
    const result = db.prepare('UPDATE ssh_keys SET key_name = ? WHERE id = ?')
      .run(keyName, keyId);
      
    // Log activity
    logUserActivity(userId, 'update_ssh_key', { keyId, keyName });
    
    return result.changes > 0;
  } catch (error) {
    console.error('Error updating SSH key:', error);
    throw error;
  }
}

// Remove an SSH key
export function removeSshKey(userId: number, keyId: number): boolean {
  try {
    // Check if table exists
    let tableExists = false;
    try {
      const result = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ssh_keys'").get();
      tableExists = !!result;
    } catch (e) {
      // Table doesn't exist
    }
    
    if (!tableExists) {
      throw new Error('SSH keys table not available. Run migrations first.');
    }
    
    // Verify key belongs to user
    const key = db.prepare('SELECT * FROM ssh_keys WHERE id = ? AND user_id = ?')
      .get(keyId, userId);
      
    if (!key) {
      throw new Error('SSH key not found or does not belong to user');
    }
    
    // Remove the key
    const result = db.prepare('DELETE FROM ssh_keys WHERE id = ?').run(keyId);
    
    // Update legacy column for backward compatibility
    const user = getUserById(userId);
    if (user) {
      const allKeys = user.sshKeys
        .filter(k => k.id !== keyId)
        .map(k => k.value);
      
      db.prepare('UPDATE users SET ssh_keys = ? WHERE id = ?')
        .run(allKeys.join('\n'), userId);
    }
    
    // Log activity
    logUserActivity(userId, 'remove_ssh_key', { keyId });
    
    return result.changes > 0;
  } catch (error) {
    console.error('Error removing SSH key:', error);
    throw error;
  }
}

// Add email address
export function addEmail(userId: number, email: string, isPrimary = false): number {
  try {
    // Validate email
    if (!validateEmail(email)) {
      throw new Error('Invalid email format');
    }
    
    // Check if email already exists
    const existingEmail = db.prepare('SELECT id FROM user_emails WHERE email = ?').get(email);
    if (existingEmail) {
      throw new Error('Email address already in use');
    }
    
    // Begin manual transaction with better-sqlite3
    db.prepare('BEGIN').run();
    
    try {
      // If setting as primary, unset any existing primary
      if (isPrimary) {
        db.prepare('UPDATE user_emails SET is_primary = 0 WHERE user_id = ?').run(userId);
      }
      
      // Insert new email
      const result = db.prepare(
        'INSERT INTO user_emails (user_id, email, is_primary) VALUES (?, ?, ?)'
      ).run(userId, email, isPrimary ? 1 : 0);
      
      // Log activity
      logUserActivity(userId, 'add_email', { email, isPrimary });
      
      // Commit transaction
      db.prepare('COMMIT').run();
      
      // Get the inserted ID
      const newEmail = db.prepare('SELECT id FROM user_emails WHERE user_id = ? AND email = ?')
        .get(userId, email);
        
      return newEmail ? newEmail.id : 0;
    } catch (error) {
      // Rollback on error
      db.prepare('ROLLBACK').run();
      throw error;
    }
  } catch (error) {
    console.error('Error adding email:', error);
    throw error;
  }
}

// Update email (set primary, etc)
export function updateEmail(userId: number, emailId: number, isPrimary: boolean): boolean {
  try {
    // Verify email belongs to user
    const email = db.prepare(
      'SELECT * FROM user_emails WHERE id = ? AND user_id = ?'
    ).get(emailId, userId);
    
    if (!email) {
      throw new Error('Email not found or does not belong to user');
    }
    
    // Begin manual transaction
    db.prepare('BEGIN').run();
    
    try {
      // If setting as primary, unset any existing primary
      if (isPrimary) {
        db.prepare('UPDATE user_emails SET is_primary = 0 WHERE user_id = ?').run(userId);
      }
      
      // Update the email
      const result = db.prepare('UPDATE user_emails SET is_primary = ? WHERE id = ?')
        .run(isPrimary ? 1 : 0, emailId);
        
      // Log activity
      logUserActivity(userId, 'update_email_primary', { emailId, isPrimary });
      
      // Commit transaction
      db.prepare('COMMIT').run();
      
      return result.changes > 0;
    } catch (error) {
      // Rollback on error
      db.prepare('ROLLBACK').run();
      throw error;
    }
  } catch (error) {
    console.error('Error updating email:', error);
    throw error;
  }
}

// Remove email
export function removeEmail(userId: number, emailId: number): boolean {
  try {
    // Verify email belongs to user
    const email = db.prepare(
      'SELECT * FROM user_emails WHERE id = ? AND user_id = ?'
    ).get(emailId, userId);
    
    if (!email) {
      throw new Error('Email not found or does not belong to user');
    }
    
    // Check if it's the only email - don't allow removing the last email
    const emailCount = db.prepare('SELECT COUNT(*) as count FROM user_emails WHERE user_id = ?')
      .get(userId).count;
      
    if (emailCount <= 1) {
      throw new Error('Cannot remove the only email address');
    }
    
    // Check if it's primary
    if (email.is_primary) {
      throw new Error('Cannot remove primary email address. Set another email as primary first.');
    }
    
    // Delete the email
    const result = db.prepare('DELETE FROM user_emails WHERE id = ?').run(emailId);
    
    // Log activity
    logUserActivity(userId, 'remove_email', { emailId, email: email.email });
    
    return result.changes > 0;
  } catch (error) {
    console.error('Error removing email:', error);
    throw error;
  }
}

// Log user activity for audit purposes
function logUserActivity(userId: number, action: string, details: any): void {
  try {
    db.prepare(
      'INSERT INTO user_activity (user_id, action_type, details) VALUES (?, ?, ?)'
    ).run(userId, action, JSON.stringify(details));
  } catch (error) {
    console.error('Error logging user activity:', error);
    // Don't throw - this is a non-critical operation
  }
}

// Utility: Validate SSH key (basic validation)
function validateSshKey(key: string): boolean {
  // Basic validation - should be more comprehensive in production
  if (!key || typeof key !== 'string' || key.trim().length === 0) return false;
  
  // Check if it starts with ssh-rsa, ssh-ed25519, or similar
  return /^(ssh-rsa|ssh-ed25519|ssh-dss|ecdsa-sha2-nistp256|ecdsa-sha2-nistp384|ecdsa-sha2-nistp521)\s+[A-Za-z0-9+/]+[=]{0,3}(\s+.*)?$/.test(key.trim());
}

// Utility: Validate email (basic validation)
function validateEmail(email: string): boolean {
  // Basic email validation
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
} 