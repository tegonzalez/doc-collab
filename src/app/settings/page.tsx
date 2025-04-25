'use client';

import React, { useState } from 'react';
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { useToast } from "../../hooks/use-toast";

export default function SettingsPage() {
    const { toast } = useToast();
    const [displayName, setDisplayName] = useState('Current User Name'); // Replace with actual user data later
    const [sshKeys, setSshKeys] = useState('ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQD...'); // Replace with actual keys

    const handleSaveProfile = () => {
        // Add logic to save display name
        console.log("Saving display name:", displayName);
        toast({ title: "Profile Saved", description: "Display name updated." });
    };

    const handleSaveSshKeys = () => {
        // Add logic to save SSH keys
        console.log("Saving SSH Keys:", sshKeys);
        toast({ title: "SSH Keys Saved", description: "SSH public keys updated." });
    };

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-4xl"> {/* Added container and padding */}
             <h1 className="text-3xl font-bold mb-6">Settings</h1>

             <div className="space-y-8">
                {/* Profile Settings Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Profile</CardTitle>
                        <CardDescription>Manage your display name.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="space-y-2">
                            <Label htmlFor="displayName">Display Name</Label>
                            <Input
                                id="displayName"
                                value={displayName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDisplayName(e.target.value)}
                                placeholder="Enter your display name"
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleSaveProfile}>Save Profile</Button>
                    </CardFooter>
                </Card>

                {/* SSH Key Management Card */}
                 <Card>
                    <CardHeader>
                        <CardTitle>SSH Public Keys</CardTitle>
                        <CardDescription>Manage your SSH public keys for repository access.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="space-y-2">
                             <Label htmlFor="sshKeys">Public Keys</Label>
                             <Textarea
                                id="sshKeys"
                                value={sshKeys}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSshKeys(e.target.value)}
                                placeholder="Paste your SSH public keys here (one per line)"
                                rows={6}
                                className="font-mono text-sm" // Style for keys
                             />
                             <p className="text-xs text-muted-foreground">
                                 Add your public SSH keys to allow secure access. Each key should start with &apos;ssh-rsa&apos; or similar.
                             </p>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleSaveSshKeys}>Save SSH Keys</Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
