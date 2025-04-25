'use client';

import { useState } from 'react'; // Import useState
import { Button } from './ui/button';
import { Input } from './ui/input';
// import { Separator } from './ui/separator';
// import {
//     Sheet,
//     SheetContent,
//     SheetDescription,
//     SheetHeader,
//     SheetTitle,
//     SheetTrigger,
// } from './ui/sheet'; 
// import { Skeleton } from './ui/skeleton'; 
// import {
//     Tooltip,
//     TooltipContent,
//     TooltipProvider,
//     TooltipTrigger,
// } from './ui/tooltip'; 
// import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'; 
// import { ScrollArea } from './ui/scroll-area'; 
// import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog"; 
// import { Label } from "./ui/label"; 
// import { Textarea } from "./ui/textarea"; 
// import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "./ui/table"; 
// import { Badge } from "./ui/badge"; 
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "./ui/accordion"; 
// import { Alert, AlertDescription, AlertTitle } from "./ui/alert"; 
// import { type DocumentFormat } from "@/services/pandoc"; 
// import {
//     DropdownMenu,
//     DropdownMenuCheckboxItem,
//     DropdownMenuContent,
//     DropdownMenuItem,
//     DropdownMenuRadioGroup,
//     DropdownMenuRadioItem,
//     DropdownMenuSeparator,
//     DropdownMenuShortcut,
//     DropdownMenuSub,
//     DropdownMenuSubContent,
//     DropdownMenuSubTrigger,
//     DropdownMenuTrigger,
// } from "./ui/dropdown-menu"; 
// import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover"; 
// import { Calendar } from "./ui/calendar"; 
// import { cn } from "@/lib/utils";
import { Activity, TreePalm, Upload } from "lucide-react"; // Removed unused icons
// import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog"; 
// import { AspectRatio } from "./ui/aspect-ratio"; 
import { useToast } from "../hooks/use-toast";
import ProjectTreeView from './ProjectTreeView'; // Import the new component

// TODO: Replace this with the actual dynamic project ID
const PLACEHOLDER_PROJECT_ID = "1"; 

export function ProjectExplorer() {
    const { toast } = useToast(); 
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        setSelectedFile(file || null);
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            toast({ title: 'No File Selected', description: 'Please select a file to upload.', variant: 'destructive' });
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('projectId', PLACEHOLDER_PROJECT_ID); // Add projectId

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Upload failed');
            }

            toast({ title: 'Upload Successful', description: `File ${selectedFile.name} uploaded.` });
            setSelectedFile(null); // Clear the selected file
            // Optionally, refresh the project tree or activity feed here

        } catch (error) {
            console.error("Upload error:", error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            toast({ title: 'Upload Failed', description: errorMessage, variant: 'destructive' });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="p-4">
            <Accordion type="multiple" defaultValue={["activity", "tree"]} className="w-full space-y-4">
                <AccordionItem value="activity">
                    <AccordionTrigger className="text-xl font-semibold">
                         <Activity className="mr-2 h-5 w-5" /> Activity
                    </AccordionTrigger>
                    <AccordionContent>
                        <ActivityFeed />
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="tree">
                    <AccordionTrigger className="text-xl font-semibold">
                        <TreePalm className="mr-2 h-5 w-5" /> Project Tree
                    </AccordionTrigger>
                    <AccordionContent>
                        <ProjectTreeView projectId={PLACEHOLDER_PROJECT_ID} /> {/* Pass projectId */}
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="upload">
                    <AccordionTrigger className="text-xl font-semibold">
                         <Upload className="mr-2 h-5 w-5" /> Upload
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="p-4 space-y-4">
                            <p className="text-muted-foreground">Use this section to upload documents.</p>
                            <Input 
                                type="file" 
                                onChange={handleFileChange} 
                                disabled={isUploading} 
                                // Reset file input visually when selectedFile is cleared
                                key={selectedFile ? 'file-selected' : 'no-file'} 
                            />
                            {/* Display selected file name */}
                            {selectedFile && (
                                <p className="text-sm text-muted-foreground">
                                    Selected file: {selectedFile.name}
                                </p>
                            )}
                            {!selectedFile && (
                                <p className="text-sm text-muted-foreground">
                                    No file selected.
                                </p>
                            )}
                            <Button onClick={handleUpload} disabled={!selectedFile || isUploading}>
                                {isUploading ? 'Uploading...' : 'Upload File'}
                            </Button>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
}


function ActivityFeed() {
    // TODO: Fetch and display actual activity data based on projectId
    return (
        <div className="bg-card rounded-lg shadow-md p-4">
            <ul>
                <li className="py-2 border-b last:border-b-0">
                    <span className="font-semibold">User A</span> uploaded a new document.
                </li>
                <li className="py-2 border-b last:border-b-0">
                    <span className="font-semibold">User B</span> made changes to an
                    existing document.
                </li>
            </ul>
        </div>
    );
}
