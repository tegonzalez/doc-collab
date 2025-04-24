'use client';

import {useState} from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  SidebarGroupLabel,
  SidebarMenuAction, // Corrected import
} from '@/components/ui/sidebar';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Separator} from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {Skeleton} from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter} from "@/components/ui/dialog"
import {Label} from "@/components/ui/label"
import {Textarea} from "@/components/ui/textarea"
import {Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow} from "@/components/ui/table"
import {Badge} from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert"
import {type DocumentFormat} from "@/services/pandoc"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils";
import { CalendarIcon, ChevronDown, Copy, Folder, FolderPlus, Github, LucideIcon, Mail, MessageSquare, Plus, Settings, Trash, Upload, UserPlus } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { AspectRatio } from "./ui/aspect-ratio";
import { useToast } from "@/hooks/use-toast"

const PROJECT_ID = "project-1"

const FolderIcon: LucideIcon = Folder

const gitHubUrl = 'https://github.com/orgs/genkit-ai/repositories'

export function ProjectExplorer() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { toast } = useToast()

  const handleUpload = () => {
    // Implement your upload logic here
    toast({
      title: "Uploaded!",
      description: "Your files have been uploaded.",
    })
  };

  const handleShare = () => {
    // Implement your share logic here
    toast({
      title: "Copied!",
      description: "Shareable link has been copied to clipboard.",
    })
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader>
          <div className="mx-auto mb-2 flex w-10 items-center justify-center rounded-md border">
            <FolderIcon className="h-4 w-4" />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold">CollabFlow</h2>
            <p className="text-xs text-muted-foreground">
              Document Collaboration Platform
            </p>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Projects</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <FolderIcon className="mr-2 h-4 w-4" />
                  <span>{PROJECT_ID}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupLabel>Actions</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleUpload}>
                  <Upload className="mr-2 h-4 w-4" />
                  <span>Upload</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleShare}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  <span>Share</span>
                </SidebarMenuButton>
                <SidebarMenuAction>
                  <Copy className="h-3.5 w-3.5" />
                </SidebarMenuAction>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <a href={gitHubUrl} target="_blank" rel="noreferrer">
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Github className="mr-2 h-4 w-4" />
              GitHub
            </Button>
          </a>
        </SidebarFooter>
      </Sidebar>

      <main className="flex-1 p-4">
        <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
        <ActivityFeed />
        {/* Main Content */}
      </main>
    </div>
  );
}

function ActivityFeed() {
  return (
    <div className="bg-card rounded-lg shadow-md p-4">
      <h2 className="text-lg font-semibold mb-2">Activity Feed</h2>
      <ul>
        <li className="py-2 border-b last:border-b-0">
          <span className="font-semibold">User A</span> uploaded a new document.
        </li>
        <li className="py-2 border-b last:border-b-0">
          <span className="font-semibold">User B</span> made changes to an
          existing document.
        </li>
        {/* Add more activity items here */}
      </ul>
    </div>
  );
}

