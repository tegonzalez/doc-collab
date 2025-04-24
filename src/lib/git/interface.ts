// src/lib/git/interface.ts
// TypeScript interfaces based on mvp.md for the in-memory cache structure

export interface Project {
  id: string; // e.g., main-project
  name: string; // User-friendly name?
  description?: string;
  // Other project-level metadata?
  rootFolder: Folder;
}

export interface Folder {
  id: string; // Could be path hash or commit hash + path
  name: string;
  path: string; // Full path relative to project root
  parentId: string | null;
  // Use maps for faster lookups? Map<string, Folder | File>
  children: Array<Folder | File>;
  // Additional Git info?
  lastCommit?: CommitInfo;
   // Permissions can be stored here or looked up separately
}

export interface File {
  id: string; // Could be path hash or commit hash + path
  name: string;
  path: string; // Full path relative to project root
  parentId: string;
  mimeType: string;
  size: number; // In bytes
  isArtifact: boolean;
  sourceId?: string; // If artifact, reference to source file ID
  artifacts?: string[]; // If source, references to generated artifact IDs
  dependencies?: string[]; // References to files this file depends on (e.g., images in MD)
  lastCommit: CommitInfo;
}

export interface CommitInfo {
    hash: string;
    message: string;
    author: string; // Consider parsing "Name <email>"
    date: Date; // Or string? Store consistently
}

export interface ShareableLink {
  id: string;
  token: string;
  projectId: string;
  path: string; // Path the link applies to
  role: "read" | "contribute" | "edit";
  createdAt: Date;
  expiresAt: Date | null;
  createdBy: string; // User ID
}

console.log("Placeholder: src/lib/git/interface.ts loaded");
