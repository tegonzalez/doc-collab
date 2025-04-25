/**
 * Interface for database migrations
 */
export interface Migration {
  /**
   * Unique name of the migration
   */
  name: string;
  
  /**
   * Function to apply the migration
   */
  up(): Promise<void>;
  
  /**
   * Function to revert the migration
   */
  down(): Promise<void>;
}

/**
 * Supported theme options
 */
export type ThemeType = 'light' | 'dark' | 'system';

/**
 * Editor key binding options
 */
export type KeyBindingsType = 'default' | 'vim' | 'emacs';

/**
 * UI density options
 */
export type UIDensityType = 'compact' | 'comfortable';

/**
 * Interface for user preferences
 */
export interface UserPreferences {
  userId: string;
  theme: ThemeType;
  editorFontSize: number;
  editorFontFamily: string;
  editorTabSize: number;
  editorLineWrapping: boolean;
  editorAutoSave: boolean;
  editorKeyBindings: KeyBindingsType;
  uiDensity: UIDensityType;
} 