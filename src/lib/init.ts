import { getAppSeed } from './auth';

/**
 * Initialize critical application components at startup
 * This should be called as early as possible in the application lifecycle
 */
export function initializeApp() {
  console.log("🚀 Initializing application...");
  
  // Ensure the app seed can be retrieved from the environment at startup
  try {
    const seed = getAppSeed();
    if (seed) {
      console.log("✅ Application seed loaded from environment");
    } else {
      // This case should be handled within getAppSeed already
      console.warn("⚠️ Application seed could not be loaded (check logs for errors).");
    }
  } catch (error) {
    // Should also be handled by getAppSeed
    console.error("❌ Error during app seed initialization check:", error);
  }
  
  console.log("✅ Application initialization complete");
}

// Auto-initialize during import if not in test environment
if (process.env.NODE_ENV !== 'test') {
  initializeApp();
}

export default initializeApp; 