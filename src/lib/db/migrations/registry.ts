import { Migration } from '../types';
import { schemaMigration } from './001-schema';

/**
 * Registry of all available migrations.
 * Order matters - migrations are applied in the order they appear in this array.
 */
export const allMigrations: Migration[] = [
  schemaMigration,
  // Any future migrations would be added here
];

/**
 * Get all registered migrations
 * @returns Array of migration objects
 */
export function getMigrations(): Migration[] {
  return allMigrations;
} 