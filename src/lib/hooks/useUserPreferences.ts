import { useEffect, useState, useCallback } from 'react';
import { UserPreferences } from '../db/types';
import { useTheme } from 'next-themes';

/**
 * Default user preferences
 */
const defaultPreferences: Omit<UserPreferences, 'theme'> = {
  userId: '',
  editorFontSize: 14,
  editorFontFamily: 'monospace',
  editorTabSize: 2,
  editorLineWrapping: true,
  editorAutoSave: true,
  editorKeyBindings: 'default',
  uiDensity: 'comfortable'
};

/**
 * Hook to fetch and manage user preferences, integrating with next-themes
 */
export function useUserPreferences() {
  const [preferences, setPreferences] = useState<Omit<UserPreferences, 'theme'>>(defaultPreferences);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    async function fetchPreferences() {
      try {
        setLoading(true);
        const response = await fetch('/api/settings/preferences');
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch preferences');
        }
        
        const data = await response.json();
        
        const { theme: fetchedTheme, ...otherPrefs } = data;
        
        setPreferences(otherPrefs);
        
        if (fetchedTheme && fetchedTheme !== theme) {
          setTheme(fetchedTheme); 
        }
        
      } catch (err: any) {
        console.error('Error fetching user preferences:', err);
        setError(err.message || 'Failed to load preferences');
      } finally {
        setLoading(false);
      }
    }
    
    fetchPreferences();
  }, [setTheme]);

  const updatePreferences = useCallback(async (updates: Partial<Omit<UserPreferences, 'userId'>>) => {
    try {
      const { theme: themeUpdate, ...otherUpdates } = updates;
      
      if (Object.keys(otherUpdates).length > 0) {
        setPreferences(prev => ({ ...prev, ...otherUpdates }));
      }
      
      if (themeUpdate) {
        setTheme(themeUpdate);
      }
      
      const response = await fetch('/api/settings/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Backend update failed, potentially revert optimistic updates');
        throw new Error(errorData.error || 'Failed to update preferences');
      }
      
      const finalPreferences = await response.json();
      
      return finalPreferences; 
    } catch (err: any) {
      console.error('Error updating user preferences:', err);
      setError(err.message || 'Failed to update preferences');
      throw err;
    }
  }, [setTheme]);

  return {
    preferences: { ...preferences, theme: theme || 'system' },
    loading,
    error,
    updatePreferences,
    resolvedTheme,
  };
} 