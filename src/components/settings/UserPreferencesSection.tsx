import { useUserPreferences } from '../../lib/hooks/useUserPreferences';
import { ThemeType, KeyBindingsType, UIDensityType } from '../../lib/db/types';
import { Button } from "../ui/button";
// import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
// import { Switch } from "../ui/switch";
import { useToast } from "../../hooks/use-toast";
import { Moon, Sun, Computer } from "lucide-react";

export function UserPreferencesSection() {
  const { toast } = useToast();
  
  // User preferences hook
  const { 
    preferences, 
    loading: preferencesLoading, 
    error: preferencesError, 
    updatePreferences 
  } = useUserPreferences();
  
  // Handle theme change
  const handleThemeChange = async (theme: ThemeType) => {
    try {
      await updatePreferences({ theme });
      toast({ 
        title: "Theme Updated", 
        description: `Theme set to ${theme}.`
      });
    } catch (error) {
      console.error('Error updating theme:', error);
      toast({ 
        title: "Error", 
        description: "Failed to update theme. Please try again.", 
        variant: "destructive" 
      });
    }
  };
  
  // Comment out editor preferences change - premature feature
  /* 
  const handleEditorPreferenceChange = async (
    key: keyof Omit<typeof preferences, 'userId'>, 
    value: number | string | boolean
  ) => {
    try {
      // Create an update object with the dynamic key
      const update = { [key]: value } as any;
      
      await updatePreferences(update);
      toast({ 
        title: "Preferences Updated", 
        description: "Editor preferences saved successfully."
      });
    } catch (error) {
      console.error('Error updating editor preferences:', error);
      toast({ 
        title: "Error", 
        description: "Failed to update preferences. Please try again.", 
        variant: "destructive" 
      });
    }
  };
  */

  if (preferencesLoading) {
    return <p>Loading preferences...</p>;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Customize your interface preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Theme Selection */}
          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <div className="flex gap-4">
              <Button
                variant={preferences.theme === 'light' ? 'default' : 'outline'}
                onClick={() => handleThemeChange('light')}
                className="flex items-center gap-2"
              >
                <Sun className="h-4 w-4" />
                Light
              </Button>
              <Button
                variant={preferences.theme === 'dark' ? 'default' : 'outline'}
                onClick={() => handleThemeChange('dark')}
                className="flex items-center gap-2"
              >
                <Moon className="h-4 w-4" />
                Dark
              </Button>
              <Button
                variant={preferences.theme === 'system' ? 'default' : 'outline'}
                onClick={() => handleThemeChange('system')}
                className="flex items-center gap-2"
              >
                <Computer className="h-4 w-4" />
                System
              </Button>
            </div>
          </div>
          
          {/* Comment out all editor-related settings as they are premature */}
          {/* 
          <div className="space-y-2">
            <Label htmlFor="editorFontSize">Editor Font Size</Label>
            <div className="flex items-center gap-4">
              <Input
                id="editorFontSize"
                type="number"
                min="10"
                max="24"
                value={preferences.editorFontSize}
                onChange={(e) => handleEditorPreferenceChange(
                  'editorFontSize', 
                  parseInt(e.target.value)
                )}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">px</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="editorFontFamily">Editor Font</Label>
            <Select
              value={preferences.editorFontFamily}
              onValueChange={(value) => handleEditorPreferenceChange('editorFontFamily', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select font" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monospace">Monospace</SelectItem>
                <SelectItem value="Consolas">Consolas</SelectItem>
                <SelectItem value="'Courier New'">Courier New</SelectItem>
                <SelectItem value="'Fira Code'">Fira Code</SelectItem>
                <SelectItem value="'Source Code Pro'">Source Code Pro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="editorTabSize">Tab Size</Label>
            <Select
              value={preferences.editorTabSize.toString()}
              onValueChange={(value) => handleEditorPreferenceChange('editorTabSize', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tab size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 spaces</SelectItem>
                <SelectItem value="4">4 spaces</SelectItem>
                <SelectItem value="8">8 spaces</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="editorKeyBindings">Key Bindings</Label>
            <Select
              value={preferences.editorKeyBindings}
              onValueChange={(value) => handleEditorPreferenceChange(
                'editorKeyBindings', 
                value as KeyBindingsType
              )}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select key bindings" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="vim">Vim</SelectItem>
                <SelectItem value="emacs">Emacs</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="lineWrapping">Line Wrapping</Label>
              <Switch
                id="lineWrapping"
                checked={preferences.editorLineWrapping}
                onCheckedChange={(checked) => handleEditorPreferenceChange('editorLineWrapping', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="autoSave">Auto Save</Label>
              <Switch
                id="autoSave"
                checked={preferences.editorAutoSave}
                onCheckedChange={(checked) => handleEditorPreferenceChange('editorAutoSave', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="uiDensity">Compact UI</Label>
              <Switch
                id="uiDensity"
                checked={preferences.uiDensity === 'compact'}
                onCheckedChange={(checked) => handleEditorPreferenceChange(
                  'uiDensity', 
                  checked ? 'compact' as UIDensityType : 'comfortable' as UIDensityType
                )}
              />
            </div>
          </div>
          */}
        </div>
      </CardContent>
    </Card>
  );
} 