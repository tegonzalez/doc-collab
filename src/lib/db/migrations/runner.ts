import { migrationManager } from './index';
import { getMigrations } from './registry';

/**
 * Initialize the database migration system and run any pending migrations.
 * This should be called during application startup.
 * 
 * @returns A promise that resolves when all migrations have been applied
 */
export async function initializeMigrations(): Promise<void> {
  console.log('Initializing migration system...');
  // Initialize the migration system
  await migrationManager.initialize();
  
  // Get all available migrations
  const migrations = getMigrations();
  console.log(`Found ${migrations.length} migrations to process`);
  
  // Apply any pending migrations
  await migrationManager.applyMigrations(migrations);
}

/**
 * Force revert and reapply a specific migration (for development only).
 * Use with caution as this can lead to data loss.
 * 
 * @param migrationName The name of the migration to reapply
 */
export async function reapplyMigration(migrationName: string): Promise<void> {
  const migrations = getMigrations();
  const migration = migrations.find(m => m.name === migrationName);
  
  if (!migration) {
    throw new Error(`Migration not found: ${migrationName}`);
  }
  
  try {
    // Revert the migration
    await migrationManager.revertMigration(migration);
    
    // Apply it again
    await migrationManager.applyMigration(migration);
    
    console.log(`Migration ${migrationName} successfully reapplied`);
  } catch (error) {
    console.error(`Failed to reapply migration ${migrationName}:`, error);
    throw error;
  }
} 