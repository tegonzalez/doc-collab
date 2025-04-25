import { Umzug, UmzugOptions, RunnableMigration } from 'umzug';
import path from 'path';
import fs from 'fs';
import { db } from '../index';

// Create migrations table if it doesn't exist
const createMigrationsTableIfNeeded = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      name TEXT PRIMARY KEY,
      executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

// Umzug configuration
const migrationConfig: UmzugOptions = {
  migrations: {
    glob: 'src/lib/db/migrations/*.{js,ts}',
    // Resolver function to get the migration content
    resolve: ({ name, path: migrationPath }): RunnableMigration<any> => {
      // Define the async actions separately
      const actions = {
        up: async () => {
          console.log(`Running migration up: ${name}`);
          // Skip utility/index files
          if (migrationPath && !migrationPath.includes('migration-utils') && !migrationPath.includes('index')) {
            try {
              const migration = await import(migrationPath);
              const upFunc = migration.up || (migration.default && migration.default.up);
              if (typeof upFunc === 'function') {
                await upFunc(db);
              } else {
                console.warn(`Migration ${name} does not have a valid up function.`);
              }
              db.prepare('INSERT INTO migrations (name) VALUES (?)').run(name);
            } catch (importError) {
              console.error(`Failed to import/run UP migration ${name} at ${migrationPath}:`, importError);
            }
          }
        },
        down: async () => {
          console.log(`Running migration down: ${name}`);
          // Skip utility/index files
          if (migrationPath && !migrationPath.includes('migration-utils') && !migrationPath.includes('index')) {
            try {
              const migration = await import(migrationPath);
              const downFunc = migration.down || (migration.default && migration.default.down);
              if (typeof downFunc === 'function') {
                await downFunc(db);
              } else {
                console.warn(`Migration ${name} does not have a valid down function.`);
              }
              db.prepare('DELETE FROM migrations WHERE name = ?').run(name);
            } catch (importError) {
              console.error(`Failed to import/run DOWN migration ${name} at ${migrationPath}:`, importError);
            }
          }
        }
      };
      // Return the structure Umzug expects synchronously
      return {
        name,
        up: actions.up,
        down: actions.down
      };
    }
  },
  storage: {
    // Use our own SQLite-based storage
    logMigration: async ({ name }) => {
      // This is actually handled in the resolver's up function
      // but we keep this for consistency
      console.log(`Logging migration: ${name}`);
    },
    unlogMigration: async ({ name }) => {
      // This is actually handled in the resolver's down function
      // but we keep this for consistency
      console.log(`Unlogging migration: ${name}`);
    },
    executed: async () => {
      try {
        // Get list of already executed migrations
        const rows = db.prepare('SELECT name FROM migrations ORDER BY executed_at').all() as { name: string }[]; // Add type assertion
        return rows.map(row => row.name);
      } catch (dbError) { // Catch DB errors
        console.warn('Error reading migrations table (may not exist yet):', dbError);
        // If the table doesn't exist yet, create it and return empty array
        createMigrationsTableIfNeeded();
        return [];
      }
    }
  },
  // Add required logger property
  logger: console
};

// Create migration directory if it doesn't exist
const ensureMigrationDirExists = () => {
  const migrationsDir = path.join(process.cwd(), 'src', 'lib', 'db', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }
  return migrationsDir;
};

// Initialize Umzug with our configuration
const migrator = new Umzug(migrationConfig);

// Create a new migration file
export const createMigration = async (name: string) => {
  const migrationsDir = ensureMigrationDirExists();
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
  const fileName = `${timestamp}-${name}.ts`;
  const filePath = path.join(migrationsDir, fileName);
  
  const template = `import Database from 'better-sqlite3';

export const up = async (db: Database.Database) => {
  // Add your migration code here
  console.log('Running migration up: ${name}');
  
  // Example: creating a new table
  // db.exec(\`
  //   CREATE TABLE IF NOT EXISTS example_table (
  //     id INTEGER PRIMARY KEY AUTOINCREMENT,
  //     name TEXT NOT NULL,
  //     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  //   );
  // \`);
};

export const down = async (db: Database.Database) => {
  // Add your rollback code here
  console.log('Running migration down: ${name}');
  
  // Example: dropping the table
  // db.exec('DROP TABLE IF EXISTS example_table;');
};
`;

  fs.writeFileSync(filePath, template);
  console.log(`Created migration: ${filePath}`);
  return filePath;
};

// Run all pending migrations
export const runMigrations = async () => {
  createMigrationsTableIfNeeded();
  ensureMigrationDirExists();
  console.log('Running pending migrations...');
  const migrations = await migrator.up();
  console.log(`Executed ${migrations.length} migrations.`);
  return migrations;
};

// Revert the last migration
export const revertLastMigration = async () => {
  console.log('Reverting last migration...');
  try {
    const result = await migrator.down({ to: 0 });
    // Type checking and handling for the migration result
    if (Array.isArray(result) && result.length > 0) {
      console.log(`Reverted ${result.length} migrations`);
      return result[0];
    } else if (result) {
      console.log(`Reverted migration`);
      return result;
    }
    console.log('No migrations to revert');
    return null;
  } catch (error) {
    console.error('Error reverting migration:', error);
    return null;
  }
};

// List all executed migrations
export const listMigrations = async () => {
  const executed = await migrator.executed();
  const pending = await migrator.pending();
  
  return {
    executed,
    pending: pending.map(p => p.name),
  };
};

// Initialize the migration system
export const initMigrations = () => {
  createMigrationsTableIfNeeded();
  ensureMigrationDirExists();
  console.log('Migration system initialized.');
}; 