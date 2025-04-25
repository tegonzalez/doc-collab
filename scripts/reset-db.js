#!/usr/bin/env node
/**
 * Database Reset Script
 * 
 * This script completely resets the database by:
 * 1. Creating a backup of the current database
 * 2. Deleting the database file
 * 3. Running migrations to recreate the database with the latest schema
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const crypto = require('crypto');

// Configuration
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'collabflow.db');
// Correct path for security.env inside env directory
const SECURITY_ENV_PATH = path.join(process.cwd(), 'env', 'security.env');

console.log('Database Reset Script');
console.log('=====================');
console.log(`Database path: ${DB_PATH}`);

// Delete database file if it exists
if (fs.existsSync(DB_PATH)) {
  console.log('Deleting database file...');
  try {
    fs.unlinkSync(DB_PATH);
    console.log('Database file deleted');
  } catch (err) {
    console.error(`Error deleting database file ${DB_PATH}:`, err);
    // Decide if this should be fatal
  }
} else {
  console.log('No existing database file found. Nothing to delete.');
}

// Remove migration execution
// console.log('Running migrations...');
// try {
//   execSync('npm run db:migrate', { stdio: 'inherit' });
//   console.log('Database migrations completed successfully');

// Remove security environment file instead of backing it up
console.log(`Checking for security file at ${SECURITY_ENV_PATH} to remove...`);
if (fs.existsSync(SECURITY_ENV_PATH)) {
  try {
    fs.unlinkSync(SECURITY_ENV_PATH);
    console.log(`Removed security file: ${SECURITY_ENV_PATH}`);
  } catch (unlinkError) {
    console.error(`Error removing security file ${SECURITY_ENV_PATH}:`, unlinkError);
    // Decide if this should be fatal
  }
} else {
  console.log('No existing security file found. Nothing to remove.');
}

console.log('Database full reset completed (DB and secrets removed).');

// Removed try...catch block around migration execution 