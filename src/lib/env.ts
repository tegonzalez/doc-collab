import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

/**
 * Loads environment variables from specified files within the env directory.
 * 
 * Order of precedence (highest to lowest):
 * 1. Actual environment variables set in the shell.
 * 2. Variables defined in `.env/security.env`.
 * 3. Variables defined in `env/app.env`.
 */
export function loadEnv() {
  const envDir = path.resolve(process.cwd(), 'env');
  const envFiles = ['app.env', 'security.env', 'database.env', 'git.env'];
  
  envFiles.forEach(file => {
    const filePath = path.join(envDir, file);
    if (fs.existsSync(filePath)) {
      dotenv.config({ 
        path: filePath, 
        override: false // Do not override existing process.env variables
      });
      console.log(`Loaded environment variables from: env/${file}`);
    } else {
      console.warn(`Environment file not found, skipping: env/${file}`);
    }
  });

  // Ensure critical security variables are loaded - throw error if not found
  if (!process.env.JWT_SECRET) {
    console.error('CRITICAL: JWT_SECRET not found in environment. Check env/security.env file.');
    throw new Error('JWT_SECRET environment variable is required for secure operations.');
  }
  
  if (!process.env.APP_SEED) {
    console.error('CRITICAL: APP_SEED not found in environment. Check env/security.env file.');
    throw new Error('APP_SEED environment variable is required for secure operations.');
  }
}

// Load environment variables immediately when this module is imported
loadEnv();

// Optionally, export loaded variables if needed elsewhere directly
// export const NODE_ENV = process.env.NODE_ENV || 'development';
// export const PORT = process.env.PORT || 3000;
// ... etc 