'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "../../hooks/use-toast";
import { LogOut, PlusCircle, Trash2, Check, Mail, BellRing, Moon, Sun, Computer } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { Separator } from "../../components/ui/separator";
import { useRouter } from 'next/navigation';
import { useUserSettings } from '../../lib/hooks/useUserSettings';
import { UserPreferencesSection } from "../../components/settings/UserPreferencesSection";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../components/ui/accordion";
import { useTheme } from "next-themes";
import { UserProfileSection } from '../../components/settings/UserProfileSection';
import { EmailManagementSection } from '../../components/settings/EmailManagementSection';
import { PasswordManagementSection } from '../../components/settings/PasswordManagementSection';
import { SshKeyManagementSection } from '../../components/settings/SshKeyManagementSection';
import { useFetchUser } from '../../lib/hooks/useFetchUser';

// Import interfaces from the user service
import { UserSettings, UserEmail, SshKey } from '../../lib/db/users';

export default function SettingsPage() {
    const { 
        settings, 
        loading, 
        error, 
        updateSettings, 
        addEmail, 
        removeEmail, 
        setPrimaryEmail,
        addSshKey, 
        removeSshKey,
        signOut
    } = useUserSettings();
    
    const { toast } = useToast();
    const router = useRouter();
    
    const { theme, setTheme } = useTheme();
    
    const { user, loading: userLoading, error: userError } = useFetchUser();
    
    // State for form inputs
    const [displayName, setDisplayName] = useState('');
    const [detectedTimezone, setDetectedTimezone] = useState('UTC');
    const [newEmail, setNewEmail] = useState('');
    const [newSshKey, setNewSshKey] = useState('');
    const [newSshKeyName, setNewSshKeyName] = useState('');
    const [notificationEmail, setNotificationEmail] = useState(true);
    const [notificationUi, setNotificationUi] = useState(true);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // Populate state when settings load
    useEffect(() => {
        if (settings) {
            setDisplayName(settings.displayName || '');
            setNotificationEmail(settings.notificationSettings?.email ?? true);
            setNotificationUi(settings.notificationSettings?.ui ?? true);
        }
        setDetectedTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    }, [settings]);

    // Validation function
    const validateInput = (field: string, value: string): boolean => {
        let isValid = true;
        let errorMsg = '';

        switch (field) {
            case 'displayName':
                if (!value.trim()) {
                    isValid = false;
                    errorMsg = 'Display name cannot be empty.';
                }
                break;
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    isValid = false;
                    errorMsg = 'Invalid email format.';
                }
                break;
            case 'sshKey':
                if (!value.trim().startsWith('ssh-')) {
                    isValid = false;
                    errorMsg = 'Invalid SSH key format.';
                }
                break;
        }

        setErrors(prev => ({ ...prev, [field]: errorMsg }));
        return isValid;
    };

    // Handlers
    const handleSaveProfile = useCallback(async () => {
        if (!validateInput('displayName', displayName)) return;
        
        const success = await updateSettings({ 
            displayName
        });
        if (success) {
            toast({ title: "Profile updated successfully." });
        } else {
            toast({ title: "Failed to update profile.", variant: "destructive" });
        }
    }, [updateSettings, displayName, toast]);

    const handleAddEmail = async () => {
        if (!validateInput('email', newEmail)) return;
        
        const success = await addEmail(newEmail);
        if (success) {
            toast({ title: "Email added successfully." });
            setNewEmail('');
        } else {
            toast({ title: "Failed to add email.", variant: "destructive" });
        }
    };

    const handleRemoveEmail = async (emailId: number) => {
        const success = await removeEmail(emailId);
        if (success) {
            toast({ title: "Email removed successfully." });
        } else {
            toast({ title: "Failed to remove email.", variant: "destructive" });
        }
    };

    const handleSetPrimaryEmail = async (emailId: number) => {
        const success = await setPrimaryEmail(emailId);
        if (success) {
            toast({ title: "Primary email updated." });
        } else {
            toast({ title: "Failed to set primary email.", variant: "destructive" });
        }
    };

    const handleAddSshKey = async () => {
        if (!validateInput('sshKey', newSshKey)) return;
        
        const success = await addSshKey(newSshKey, newSshKeyName || undefined);
        if (success) {
            toast({ title: "SSH key added successfully." });
            setNewSshKey('');
            setNewSshKeyName('');
        } else {
            toast({ title: "Failed to add SSH key.", variant: "destructive" });
        }
    };

    const handleRemoveSshKey = async (keyId: number) => {
        const success = await removeSshKey(keyId);
        if (success) {
            toast({ title: "SSH key removed successfully." });
        } else {
            toast({ title: "Failed to remove SSH key.", variant: "destructive" });
        }
    };

    const handleSaveNotifications = async () => {
        const success = await updateSettings({ 
            notificationSettings: { 
                email: notificationEmail, 
                ui: notificationUi 
            }
        });
        if (success) {
            toast({ title: "Notification settings updated." });
        } else {
            toast({ title: "Failed to update notifications.", variant: "destructive" });
        }
    };

    const handleSignOut = async () => {
        await signOut();
        toast({ title: "Signed out successfully." });
        router.push('/'); // Redirect to home page after sign out
    };

    // Render functions
    const renderEmails = () => {
        if (!settings || !settings.emails || settings.emails.length === 0) {
            return <p className="text-muted-foreground">No email addresses added.</p>;
        }
        
        return settings.emails.map((email) => (
            <div key={email.id} className="flex items-center justify-between border-b pb-2 mb-2">
                <div>
                    <p className="font-medium">{email.email}</p>
                    {email.isPrimary && <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full ml-2">Primary</span>}
                    {email.isVerified ? 
                        <span className="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full ml-2">Verified</span> : 
                        <span className="text-xs text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded-full ml-2">Not Verified</span>
                    }
                </div>
                <div className="space-x-2">
                    {!email.isPrimary && (
                        <Button variant="outline" size="sm" onClick={() => email.id && handleSetPrimaryEmail(email.id)}>
                            Set Primary
                        </Button>
                    )}
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-500 border-red-200 hover:bg-red-50"
                        onClick={() => email.id && handleRemoveEmail(email.id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        ));
    };

    if (userLoading) return <div>Loading user settings...</div>;
    if (userError) return <div>Error loading user settings: {userError?.message || 'Unknown error'}</div>;
    if (!user) return <div>User not found.</div>;

    return (
        <div className="container mx-auto px-4 py-8 space-y-8">
            <h1 className="text-3xl font-bold">Settings</h1>
            
            <UserProfileSection user={user} onSave={handleSaveProfile} />
            
            <EmailManagementSection userId={user.id} />

            <PasswordManagementSection userId={user.id} />

            <SshKeyManagementSection userId={user.id} />

            <UserPreferencesSection />

            <Card>
                <CardHeader>
                    <CardTitle>Detected Timezone</CardTitle>
                    <CardDescription>Your current browser timezone used for display.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>{detectedTimezone}</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Theme</CardTitle>
                    <CardDescription>Select the application theme.</CardDescription>
                </CardHeader>
                <CardContent className="flex space-x-4">
                    <Button variant={theme === 'light' ? 'default' : 'outline'} onClick={() => setTheme('light')}>Light</Button>
                    <Button variant={theme === 'dark' ? 'default' : 'outline'} onClick={() => setTheme('dark')}>Dark</Button>
                    <Button variant={theme === 'system' ? 'default' : 'outline'} onClick={() => setTheme('system')}>System</Button>
                </CardContent>
            </Card>
            
        </div>
    );
}
