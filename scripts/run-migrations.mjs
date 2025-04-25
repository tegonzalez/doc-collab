#!/usr/bin/env node
// scripts/run-migrations.mjs
// CLI script to run database migrations

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { program } from 'commander';

// Setup for importing with ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Determine project root
const projectRoot = path.resolve(__dirname, '..');

// Set up migration directories
const migrationsDir = path.join(projectRoot, 'src', 'lib', 'db', 'migrations');

// Ensure migrations directory exists
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
}

// Import the migration utilities directly using relative path
// This is a workaround for ESM import issues
const migrationUtilsPath = path.join(projectRoot, 'src', 'lib', 'db', 'migrations', 'migration-utils.js');

// Define security env path consistently
const SECURITY_ENV_PATH = path.join(projectRoot, 'env', 'security.env');

const runCommand = async (command, args) => {
  console.log(`\n📋 Running: ${command}`);
  
  try {
    // Skip TypeScript compilation and use the JavaScript version directly
    const migrationUtils = await import(migrationUtilsPath);
    
    switch (command) {
      case 'create':
        if (!args.name) {
          console.error('❌ Migration name is required');
          process.exit(1);
        }
        const filePath = await migrationUtils.createMigration(args.name);
        console.log(`✅ Created migration: ${filePath}`);
        break;
        
      case 'run':
        console.log('🔄 Running migrations...');

        // --- BEGIN SECRET GENERATION LOGIC ---
        if (!fs.existsSync(SECURITY_ENV_PATH)) {
          console.log(`🔒 Security file not found at ${SECURITY_ENV_PATH}. Generating initial secrets...`);
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
            process.exit(1); // Exit if secrets can't be generated/written on first run
          }
        } else {
          console.log(`ℹ️ Security file found at ${SECURITY_ENV_PATH}. Secrets will not be regenerated.`);
        }
        // --- END SECRET GENERATION LOGIC ---

        const resetMode = process.env.RESET_MIGRATIONS === 'true';
        if (resetMode) {
          console.log('⚠️ RESET MODE ENABLED - Clearing migration history');
          const resetResult = await migrationUtils.resetMigrations();
          console.log(`🔄 Migrations reset. ${resetResult.deletedCount} migration records cleared.`);
        }
        const migrations = await migrationUtils.runMigrations();
        console.log(`✅ Executed ${migrations.length} migrations`);
        break;
        
      case 'revert':
        console.log('↩️ Reverting last migration...');
        const revertedMigration = await migrationUtils.revertLastMigration();
        if (revertedMigration) {
          console.log(`✅ Reverted migration: ${revertedMigration.name}`);
        } else {
          console.log('ℹ️ No migrations to revert');
        }
        break;
        
      case 'list':
        console.log('📋 Listing migrations...');
        const migrationsList = await migrationUtils.listMigrations();
        
        console.log('\nExecuted migrations:');
        if (migrationsList.executed.length === 0) {
          console.log('  No executed migrations');
        } else {
          migrationsList.executed.forEach(m => console.log(`  ✓ ${m}`));
        }
        
        console.log('\nPending migrations:');
        if (migrationsList.pending.length === 0) {
          console.log('  No pending migrations');
        } else {
          migrationsList.pending.forEach(m => console.log(`  ⏳ ${m}`));
        }
        break;
        
      default:
        console.error(`❌ Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error executing command: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
};

// Set up command line interface
program
  .name('run-migrations')
  .description('Database migration CLI for Collabflow')
  .version('1.0.0');

program
  .command('create <n>')
  .description('Create a new migration')
  .action((name) => runCommand('create', { name }));

program
  .command('run')
  .description('Run all pending migrations')
  .action(() => runCommand('run', {}));

program
  .command('revert')
  .description('Revert the last migration')
  .action(() => runCommand('revert', {}));

program
  .command('list')
  .description('List all migrations and their status')
  .action(() => runCommand('list', {}));

program.parse(process.argv);

// If no command is provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
} 