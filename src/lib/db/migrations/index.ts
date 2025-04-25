import { db } from "../index";
import { Migration } from "../types";
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Define security env path
const SECURITY_ENV_PATH = path.join(process.cwd(), 'env', 'security.env');

/**
 * Manages database migrations to ensure schema changes are applied consistently.
 * Handles tracking, applying, and reverting migrations.
 */
export class MigrationManager {
  private isInitialized = false;

  /**
   * Initialize the migrations system
   */
  async initialize(): Promise<void> {
    // Create the migrations table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    this.isInitialized = true;
  }

  /**
   * Get a list of all applied migrations
   */
  async getAppliedMigrations(): Promise<string[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const migrations = db.prepare('SELECT name FROM migrations').all();
    return migrations.map(m => m.name);
  }

  /**
   * Apply a single migration
   */
  async applyMigration(migration: Migration): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    console.log(`Applying migration: ${migration.name}`);
    
    try {
      // Run the migration
      await migration.up();
      
      // Record the migration in the database
      db.prepare('INSERT OR IGNORE INTO migrations (name) VALUES (?)').run(migration.name);
      
      console.log(`Migration ${migration.name} applied successfully`);
    } catch (error) {
      console.error(`Error applying migration ${migration.name}:`, error);
      throw error;
    }
  }

  /**
   * Revert a single migration
   */
  async revertMigration(migration: Migration): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    console.log(`Reverting migration: ${migration.name}`);
    
    try {
      // Run the down migration
      await migration.down();
      
      // Remove the migration from the database
      db.prepare('DELETE FROM migrations WHERE name = ?').run(migration.name);
      
      console.log(`Migration ${migration.name} reverted successfully`);
    } catch (error) {
      console.error(`Error reverting migration ${migration.name}:`, error);
      throw error;
    }
  }

  /**
   * Apply all pending migrations from a provided list
   */
  async applyMigrations(migrations: Migration[]): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // --- BEGIN SECRET GENERATION LOGIC ---
    if (!fs.existsSync(SECURITY_ENV_PATH)) {
      console.log(`🔒 Security file not found at ${SECURITY_ENV_PATH}. Generating initial secrets during migration check...`);
      try {
        const newAppSeed = crypto.randomBytes(32).toString('hex');
        const newJwtSecret = crypto.randomBytes(64).toString('hex');
        const securityEnvContent = `APP_SEED=${newAppSeed}\nJWT_SECRET=${newJwtSecret}\n`;

        const envDir = path.dirname(SECURITY_ENV_PATH);
        if (!fs.existsSync(envDir)){
            fs.mkdirSync(envDir, { recursive: true });
            console.log(`📁 Created env directory at ${envDir}`);
        }

        fs.writeFileSync(SECURITY_ENV_PATH, securityEnvContent, 'utf8');
        console.log(`✅ Successfully generated and wrote initial secrets to ${SECURITY_ENV_PATH}`);
      } catch (writeError) {
        console.error(`❌ Error generating or writing secrets to ${SECURITY_ENV_PATH}:`, writeError);
        // Decide if this should be fatal for startup
        process.exit(1); // Exit if secrets can't be generated/written
      }
    } else {
      // Optionally log that the file exists, or just proceed silently
      // console.log(`ℹ️ Security file found at ${SECURITY_ENV_PATH}. Secrets will not be regenerated.`);
    }
    // --- END SECRET GENERATION LOGIC ---

    // Get already applied migrations
    const appliedMigrations = await this.getAppliedMigrations();
    
    // Filter out migrations that have already been applied
    const pendingMigrations = migrations.filter(m => !appliedMigrations.includes(m.name));
    
    if (pendingMigrations.length === 0) {
      console.log('No pending migrations to apply');
      return;
    }
    
    console.log(`Applying ${pendingMigrations.length} pending migrations`);
    
    // Apply each pending migration in order
    for (const migration of pendingMigrations) {
      await this.applyMigration(migration);
    }
    
    console.log('All migrations applied successfully');
  }
}

// Export a singleton instance
export const migrationManager = new MigrationManager(); 