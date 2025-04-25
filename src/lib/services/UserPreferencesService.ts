import { db } from '../db';
import { KeyBindingsType, ThemeType, UIDensityType, UserPreferences } from '../db/types';

/**
 * Service for managing user preferences
 */
export class UserPreferencesService {
  /**
   * Get user preferences by user ID
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    const stmt = db.prepare(`
      SELECT * FROM user_preferences WHERE user_id = ?
    `);
    const result = stmt.get(userId) as any;
    
    if (!result) {
      // If no preferences exist, create default ones
      return this.createDefaultPreferences(userId);
    }
    
    // Map from database snake_case to camelCase
    return {
      userId: result.user_id,
      theme: result.theme as ThemeType,
      editorFontSize: result.editor_font_size,
      editorFontFamily: result.editor_font_family,
      editorTabSize: result.editor_tab_size,
      editorLineWrapping: Boolean(result.editor_line_wrapping),
      editorAutoSave: Boolean(result.editor_auto_save),
      editorKeyBindings: result.editor_key_bindings as KeyBindingsType,
      uiDensity: result.ui_density as UIDensityType
    };
  }
  
  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string, 
    preferences: Partial<Omit<UserPreferences, 'userId'>>
  ): Promise<UserPreferences> {
    // Get current preferences to merge with updates
    const current = await this.getUserPreferences(userId);
    
    // Merge updates with current preferences
    const updated = { ...current, ...preferences };
    
    // Prepare the SQL update parts
    const updates: string[] = [];
    const params: any[] = [];
    
    if (preferences.theme !== undefined) {
      updates.push('theme = ?');
      params.push(preferences.theme);
    }
    
    if (preferences.editorFontSize !== undefined) {
      updates.push('editor_font_size = ?');
      params.push(preferences.editorFontSize);
    }
    
    if (preferences.editorFontFamily !== undefined) {
      updates.push('editor_font_family = ?');
      params.push(preferences.editorFontFamily);
    }
    
    if (preferences.editorTabSize !== undefined) {
      updates.push('editor_tab_size = ?');
      params.push(preferences.editorTabSize);
    }
    
    if (preferences.editorLineWrapping !== undefined) {
      updates.push('editor_line_wrapping = ?');
      params.push(preferences.editorLineWrapping ? 1 : 0);
    }
    
    if (preferences.editorAutoSave !== undefined) {
      updates.push('editor_auto_save = ?');
      params.push(preferences.editorAutoSave ? 1 : 0);
    }
    
    if (preferences.editorKeyBindings !== undefined) {
      updates.push('editor_key_bindings = ?');
      params.push(preferences.editorKeyBindings);
    }
    
    if (preferences.uiDensity !== undefined) {
      updates.push('ui_density = ?');
      params.push(preferences.uiDensity);
    }
    
    // If there are no updates, return the current preferences
    if (updates.length === 0) {
      return current;
    }
    
    // Add the user_id parameter
    params.push(userId);
    
    // Construct the SQL query
    const sql = `
      UPDATE user_preferences
      SET ${updates.join(', ')}
      WHERE user_id = ?
    `;
    
    // Execute the update
    const stmt = db.prepare(sql);
    stmt.run(...params);
    
    return updated;
  }
  
  /**
   * Create default preferences for a user
   */
  private async createDefaultPreferences(userId: string): Promise<UserPreferences> {
    const defaults: UserPreferences = {
      userId,
      theme: 'system',
      editorFontSize: 14,
      editorFontFamily: 'monospace',
      editorTabSize: 2,
      editorLineWrapping: true,
      editorAutoSave: true,
      editorKeyBindings: 'default',
      uiDensity: 'comfortable'
    };
    
    // Insert default preferences
    const stmt = db.prepare(`
      INSERT INTO user_preferences (
        user_id, theme, editor_font_size, editor_font_family,
        editor_tab_size, editor_line_wrapping, editor_auto_save,
        editor_key_bindings, ui_density
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      defaults.userId,
      defaults.theme,
      defaults.editorFontSize,
      defaults.editorFontFamily,
      defaults.editorTabSize,
      defaults.editorLineWrapping ? 1 : 0,
      defaults.editorAutoSave ? 1 : 0,
      defaults.editorKeyBindings,
      defaults.uiDensity
    );
    
    return defaults;
  }
}

// Export a singleton instance
export const userPreferencesService = new UserPreferencesService(); 