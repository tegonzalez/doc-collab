import { NextRequest, NextResponse } from "next/server";
import { db } from '@/lib/db';
// import { UserPreferences } from '@/lib/types/user'; // Removed non-existent import

// Define the preferences interface (matches table columns)
interface UserPreferencesRow {
  user_id: number;
  theme: 'light' | 'dark' | 'system';
  editor_font_size: number;
  editor_font_family: string;
  editor_tab_size: number;
  editor_line_wrapping: number; // Use 0/1 for BOOLEAN in SQLite
  editor_auto_save: number;     // Use 0/1 for BOOLEAN in SQLite
  editor_key_bindings: 'default' | 'vim' | 'emacs';
  ui_density: 'comfortable' | 'compact';
}

// Helper to convert DB row (0/1) to JS boolean
function dbToBoolean(value: number): boolean {
  return value === 1;
}

// Helper to convert JS boolean to DB value (0/1)
function booleanToDb(value: boolean): number {
  return value ? 1 : 0;
}

/**
 * GET /api/settings/preferences
 * Get the current user's preferences from the user_preferences table
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const numericUserId = parseInt(userId, 10);
    if (isNaN(numericUserId) || numericUserId <= 0) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Get preferences from user_preferences table
    const stmt = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?');
    const result = stmt.get(numericUserId) as UserPreferencesRow | undefined;

    if (!result) {
      // If no record exists, potentially return defaults or insert defaults
      // For now, let's return defaults based on the schema
      const defaultPrefs = {
        theme: 'system',
        editorFontSize: 14,
        editorFontFamily: 'monospace',
        editorTabSize: 2,
        editorLineWrapping: true, // Convert from DB default (1)
        editorAutoSave: true,     // Convert from DB default (1)
        editorKeyBindings: 'default',
        uiDensity: 'comfortable',
      };
      console.log(`No preferences found for user ${numericUserId}, returning defaults.`);
      return NextResponse.json(defaultPrefs);
    }

    // Convert boolean fields from DB format (0/1) to JS format (true/false)
    const preferences = {
      ...result,
      editor_line_wrapping: dbToBoolean(result.editor_line_wrapping),
      editor_auto_save: dbToBoolean(result.editor_auto_save),
    };
    // Remove user_id before sending to client
    delete (preferences as any).user_id;

    return NextResponse.json(preferences);
  } catch (error: any) {
    console.error('Error retrieving user preferences:', error);
    return NextResponse.json({ error: 'Server error retrieving preferences' }, { status: 500 });
  }
}

/**
 * PUT /api/settings/preferences
 * Update the current user's preferences in the user_preferences table
 */
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const numericUserId = parseInt(userId, 10);
    if (isNaN(numericUserId) || numericUserId <= 0) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const body = await request.json();

    // Prepare updates, converting booleans to DB format (0/1)
    const updates: Partial<Omit<UserPreferencesRow, 'user_id'>> = {};
    const validKeys = [
        'theme', 'editor_font_size', 'editor_font_family', 'editor_tab_size', 
        'editor_line_wrapping', 'editor_auto_save', 'editor_key_bindings', 'ui_density'
    ];
    
    for (const key of validKeys) {
        if (body[key] !== undefined) {
            if (key === 'editor_line_wrapping' || key === 'editor_auto_save') {
                (updates as any)[key] = booleanToDb(body[key]);
            } else {
                (updates as any)[key] = body[key];
            }
        }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid preference fields provided' }, { status: 400 });
    }

    // Use INSERT OR REPLACE (UPSERT) to handle both new and existing users
    const columns = Object.keys(updates);
    const placeholders = columns.map(() => '?').join(', ');
    const values = Object.values(updates);
    
    const setClause = columns.map(col => `${col} = ?`).join(', ');

    // Use INSERT ... ON CONFLICT ... UPDATE for UPSERT
    const sql = `
      INSERT INTO user_preferences (user_id, ${columns.join(', ')}) 
      VALUES (?, ${placeholders}) 
      ON CONFLICT(user_id) DO UPDATE SET 
      ${setClause};
    `;

    const stmt = db.prepare(sql);
    stmt.run(numericUserId, ...values, ...values); // Pass values twice for INSERT and UPDATE parts

    // Fetch the updated preferences to return
    const updatedStmt = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?');
    const updatedResult = updatedStmt.get(numericUserId) as UserPreferencesRow;

    const finalPreferences = {
        ...updatedResult,
        editor_line_wrapping: dbToBoolean(updatedResult.editor_line_wrapping),
        editor_auto_save: dbToBoolean(updatedResult.editor_auto_save),
    };
    delete (finalPreferences as any).user_id;

    return NextResponse.json(finalPreferences);

  } catch (error: any) {
    console.error('Error updating user preferences:', error);
    return NextResponse.json({ error: 'Server error updating preferences' }, { status: 500 });
  }
}

// Delete not implemented in original structure, can add later if needed
// export async function DELETE(request: NextRequest) { ... } 