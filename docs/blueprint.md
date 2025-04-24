# **App Name**: CollabFlow

## Core Features:

- Project Explorer: Display the project folder structure with assets and artifacts. Allow navigation and preview of documents. Display file history and diffs.
- Collaboration and Sharing: Allow users to upload files and generate shareable links with different permission levels (read-only, contributor, editor).
- AI-Powered Commit Suggestions: Use an AI tool to suggest commit messages based on the changes made to the documents. (STUB - For Future Use)

## Style Guidelines:

- Primary color: Neutral gray (#F5F5F5) for a clean and professional look.
- Secondary color: Dark blue (#303F9F) for headers and important elements.
- Accent: Teal (#009688) for interactive elements and highlights.
- Clear and readable sans-serif fonts for all text elements.
- Simple and modern icons for navigation and actions.
- Clean and well-organized layout with a clear hierarchy.
- Subtle animations and transitions for a smooth user experience.

## Original User Request:
# MVP Plan for Document Collaboration Platform

This document outlines the Minimum Viable Product (MVP) plan for a self-hosted document workflow platform focused on simplicity, security, and effective collaboration.

## Core MVP Requirements

The MVP focuses on enabling multiple users to collaborate on documents without requiring all participants to create accounts:

1. **Single Kubernetes Image Deployment**
   - Combined web server, filesystem, database, and pandoc in one container
   - Self-contained application with minimal dependencies
   - Simple deployment and maintenance

2. **Minimalist Authentication Model**
   - Single administrative user (author/developer) account
   - Ability to generate permanent, shareable links for collaborators
   - Role-based access without requiring user registration:
     - Read-only: Can view documents and assets
     - Contributor: Can make suggested changes (managed as a branch/fork or PR)
     - Editor: Can directly edit assets

3. **Document Management Features**
   - File explorer with intuitive organization
   - Version history tracking and exploration
   - Upload/download capabilities
   - Visual diff comparison between versions
   - Folder-level access permissions

4. **Git Integration**
   - Single Git project accessible via installed public keys
   - Support for local Git clone and push operations
   - Strict single-ancestor history/no merge policy - rebase only
   - Version control for all asset changes

5. **Asset Management**
   - Folder-level permissions for all assets and artifacts
   - Relationship tracking between related assets
   - Support for markdown and associated supporting files

6. **Caching and Artifact Management**
   - Efficient caching system for derived artifacts
   - Automatic invalidation when source files change
   - Clear dependency tracking (e.g., PDF → MD relationships)

7. **Modern Interface**
   - Clean, intuitive UI compatible with all major desktop browsers
   - Mobile-responsive design for access across devices
   - Consistent visual language and intuitive iconography
   - Interactive navigation with breadcrumbs and hierarchy
   - Real-time collaboration indicators and notifications
   - Contextual actions based on asset types and user permissions
   - Search functionality with filtering capabilities

## Technical Architecture

### Component Structure

```
┌─────────────────────────────────────────────────────────┐
│                  Kubernetes Container                   │
├─────────────┬─────────────┬─────────────┬──────────────┤
│  Web Server │ File System │  Database   │    Pandoc    │
│  (Node.js)  │  Storage    │ (SQLite/    │ Conversion   │
│             │             │  Firebase)  │              │
├─────────────┴─────────────┴─────────────┴──────────────┤
│                   Git Version Control                   │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack

1. **Backend**
   - Node.js for server-side logic
   - Express.js for API endpoints
   - SQLite for database (self-contained) or Firebase (for easier scalability)
   - Git for version control
   - WebSockets for real-time collaboration

2. **Frontend**
   - Modern framework: Vue.js (lightweight, easy to learn)
   - Responsive CSS framework (Tailwind CSS)
   - Markdown editor with preview functionality
   - Diff visualization (using diff2html or similar)

3. **Document Processing**
   - Pandoc for document format conversion
   - Markdown as the primary document format
   - Support for common file formats (PDF, DOCX, images)

4. **Security**
   - JWT for authentication
   - HTTPS encryption
   - Path-based access control for different permission levels
   - Sanitization of user inputs

### Data Storage

1. **Document Structure**
   ```
   projects/
   ├── project-1/
   │   ├── folder-1/
   │   │   ├── document-1.md
   │   │   ├── image-1.png
   │   │   └── document-1.pdf (derived)
   │   └── folder-2/
   │       └── ...
   └── project-2/
       └── ...
   ```

 > names like "project-1" and "folder-1" should be named as a unique hashes of some signifying meta data.

2. **Database Schema**
   - `users`: Admin user information
   - `shared_links`: Token-based access links with expiration and permissions

We don't want reconcilation issues between the git project and the database, so we should use metadata files in the project to track the relationships between assets and asset permissions. In memory database on the server side can cache this information - strictly invalidating it on file system changes.
   - `folders`: Folder metadata and access controls
   - `files`: File metadata, including dependency relationships
   - `versions`: Version history and commit information

## User Experience Flow

### General UI/UX, navigation, and terminology:

1. **Interface Design**
   - Clean, modern UI compatible with all major desktop browsers
   - Mobile-responsive design optimized for various screen sizes
   - Consistent visual language throughout the application
   - Intuitive iconography with tooltips for enhanced usability

2. **Authentication**
   - JWT token authentication for admin user/developer access
   - Single sign-on via secure link for administrator
   - Session cookie storage after authentication
   - Collaborator access via shareable links generated by admin
   - Visual indicators of current user's permission level

3. **Navigation**
   - Hierarchical tree structure for projects, folders, and files
   - Breadcrumb navigation for clear location awareness
   - Recent items quick access
   - Search functionality with filtering options
   - Keyboard shortcuts for power users

4. **Terminology**
   - **Projects** - Top-level organizational units (corresponding to Git projects)
   - **Assets** - User-contributed files of any type, stored and version-controlled
   - **Artifacts** - System-generated files derived from assets, cached for performance
   - **Revisions** - Tracked changes to assets (git commits abstracted from user)
   - **Roles** - Permission levels for collaborators (Read-only, Contributor, Editor)

5. **Dashboard**
   - Activity feed showing recent changes
   - Statistics and KPIs for project overview
   - Quick access to frequently used documents
   - Notifications for collaborative activities
   - Project and folder navigation panel
   - Access to per-project, per-folder, and per-file history (commit log)

6. **Content Management**
   - Drag-and-drop file upload with progress indicators
   - Contextual actions for files and folders (view, download, convert)
   - Artifact generation from files (e.g., MD → PDF conversion)
   - Visual differentiation between files
   - Visually represent conceptual files (assets and artifacts) as files even if backed by a folder in the git project
   - Inline preview for supported file types

7. **Version Management**
   - Visual timeline of document changes with appropriate metadata (eg. date, author, annotation (commit message))
   - Ability to view and compare versions and different files. (eg. diff between asset and artifact)
   - Diff visualization for text-based files
   - Git-powered versioning abstracted behind user-friendly interface

8. **Collaboration**
   - Shareable link generation with customizable permissions
   - Real-time presence indicators for concurrent users
   - Permission management at folder levels (recall that a file asset is backed by a folder in the git project)

9. **Settings and Administration**
   - User profile and preference management
   - SSH public key management for direct Git access
   - Collaborator link management (create, revoke, modify)
   - System configuration and monitoring
   - Backup and restore functionality

### Admin User Journey

1. **Authentication**
   - Secure access via JWT token or generated link
   - Personalized dashboard with activity overview and statistics
   - Clear indication of administrator privileges

2. **Project and Asset Management**
   - Create new projects, folders, and documents
   - Upload existing files with drag-and-drop functionality
   - Organize content with intuitive tree navigation
   - Generate artifacts from assets with various conversion options

3. **Collaboration Management**
   - Generate shareable links with specific role permissions
   - Set expiration dates for temporary access
   - Monitor active sessions and collaborator activities
   - Review activity logs for all user interactions

4. **Version Management**
   - Track changes with visual timeline and attribution
   - Browse revision history with filtering options
   - Compare different versions with visual diff tools
   - Restore previous versions when needed
   - All version control powered by Git but abstracted in the UI

5. **System Administration**
   - Manage SSH public keys for direct Git access
   - Configure system settings and performance options
   - Monitor system health and resource usage
   - Perform backup and restoration operations

### External Collaborator Journey

1. **Access**
   - Open shared link in browser without registration
   - Seamless authentication via session cookies
   - Clear indication of assigned permission role
   - Personalized welcome based on link configuration

2. **Navigation and Viewing**
   - Browse accessible projects, folders, and files 
   - Navigate with breadcrumbs and tree structure
   - View document content with proper formatting and styling
   - Download assets and artifacts as needed
   - Search within permitted content scope

3. **Interaction (based on permissions)**
   - **Read-only**: View and download content
   - **Contributor**: Suggest changes and additions
   - **Editor**: Make direct modifications to content
   - Real-time awareness of other active collaborators
   - Context-specific actions based on permission level

4. **Revision Awareness**
   - See attribution for recent changes
   - Access version history based on permission level
   - View visual timeline of document evolution
   - Receive notifications of updates to frequently accessed content

## Implementation Approach

### Phase 1: Core Infrastructure

> **HITL (Human-In-The-Loop) Test Points**: Throughout this implementation plan, certain tasks are designated as critical HITL test points. These tasks require explicit verification and approval from human stakeholders before development can proceed. AI is strictly prohibited from moving beyond these checkpoints without receiving confirmation from users and documenting the progress in 'progress.md'. These checkpoints ensure quality, alignment with requirements, and appropriate functionality at key stages.

- **1.1: Foundation Setup**
  - **1.1.1: Kubernetes Container Configuration**
    - **1.1.1.1:** Define Dockerfile with Node.js, Git, SQLite, and Pandoc dependencies
    - **1.1.1.2:** Configure container networking and volume mounting for persistent storage
    - **1.1.1.3:** Set up health checks and container lifecycle management
    - **1.1.1.4:** Implement resource constraints and optimization

  - **1.1.2: Git Backend Implementation**
    - **1.1.2.1:** Implement bare Git project initialization
    - **1.1.2.2:** Implement SSH key-based authentication for remote access
    - **1.1.2.3:** Set up Git hooks for server-side validation (enforce single-ancestor/rebase-only policy, trigger cache invalidation)
    - **1.1.2.4:** Create commit message templates and validation rules

- **1.2: Server Implementation**
  - **1.2.1: Node.js Express Server Setup**
    - **1.2.1.1:** Define RESTful API architecture with versioning
    - **1.2.1.2:** Set up JWT authentication middleware structure and placeholders (actual implementation in 1.3.1.1)
    - **1.2.1.3:** Create error handling and logging framework
    - **1.2.1.4:** Set up security middleware (CORS, helmet, rate limiting)
    - **1.2.1.5:** [HITL TEST POINT] - Verify ability to access the git project, clone, and push to trigger hooks which will debug trace, but be used in the future to invalidate the cache and trigger a rebuild of the in-memory database

  - **1.2.2: Database Schema Implementation**
    - **1.2.2.1:** Create SQLite database schema for users, shared_links, and system configuration
    - **1.2.2.2:** Implement database migration system for future updates
    - **1.2.2.3:** Set up data access layer with connection pooling
    - **1.2.2.4:** Create indexing strategy for optimized queries
    - **1.2.2.5:** Design in-memory database for project structure:
      - **1.2.2.5.1:** Define TypeScript interfaces for project, folder, file, and artifact models
      - **1.2.2.5.2:** Implement efficient tree-based indexing for path-based lookups
      - **1.2.2.5.3:** Design query optimization for common file and folder operations
      - **1.2.2.5.4:** Create strict API that ensures all application logic uses the in-memory model

  - **1.2.3: In-Memory Project Cache**
    - **1.2.3.1:** Implement Git project walker to build complete project structure cache
    - **1.2.3.2:** Design efficient hierarchical object model with parent-child relationships
    - **1.2.3.3:** Create folder-level granular invalidation strategy triggered by Git hook information
    - **1.2.3.4:** Develop cache consistency verification against Git state
    - **1.2.3.5:** Build memory-efficient indexing for advanced content and metadata searches
    - **1.2.3.6:** Implement complete separation between physical Git structure and logical representation
    - **1.2.3.7:** Develop SQL statement generation for schema creation (tables, indexes) to support server restarts
    - **1.2.3.8:** Implement incremental SQL update generation for partial cache refreshes based on affected folder information from Git hooks
    - **1.2.3.9:** Implement Git hooks for robust project change detection and cache invalidation triggers
    - **1.2.3.10:** Enforce architectural constraint that application logic never uses direct file operations other than read
    - **1.2.3.11:** Implement performance monitoring for cache operations to optimize memory usage
    - **1.2.3.12:** [HITL TEST POINT] - Verify complete cache invalidation workflow by testing Git operations that trigger hooks, which then identify affected folders and execute appropriate cache invalidation. Confirm the output SQL statements correctly rebuild the in-memory database for both full refresh (server restart) and partial refresh (affected folder hierarchy) scenarios.

- **1.3: Core Services**
  - **1.3.1: Administrative Authentication System**
    - **1.3.1.1:** Implement secure JWT token generation and validation
    - **1.3.1.2:** Create admin user initialization and credential management
    - **1.3.1.3:** Set up session management and token refresh mechanism
    - **1.3.1.4:** Implement access logging for security auditing
    - **1.3.1.5:** [HITL TEST POINT] - Verify ability to locally stage the www site, generate an access token via command-line, paste the link in a browser, and confirm that authentication recognizes the browser session (cookie is persisted correctly)
    - **1.3.1.6:** [HITL TEST POINT] - Verify comprehensive logging of all authentication events, including failed attempts, token generation, and session management

  - **1.3.2: Real-time Change Notification System**
    - **1.3.2.1:** Implement WebSocket server for real-time content and status updates
    - **1.3.2.2:** Create event emission system triggered by in-memory database changes
    - **1.3.2.3:** Develop client-side notification handlers and UI update mechanisms
    - **1.3.2.4:** Implement real-time presence indicators for concurrent document viewers
    - **1.3.2.5:** Build selective notification subscriptions based on user permissions
    - **1.3.2.6:** Create notification aggregation for high-frequency changes
    - **1.3.2.7:** Implement robust reconnection and state synchronization mechanisms
    - **1.3.2.8:** [HITL TEST POINT] - Verify the complete real-time notification workflow by making Git changes in one browser window and confirming that appropriate notifications and UI updates occur immediately in another browser window without requiring page refresh

### Phase 2: Read-Only Document Visualization

- **2.1: File System Interface**
  - **2.1.1: Project Navigation Implementation**
    - **2.1.1.1:** Create API endpoints for accessing project structure from in-memory database
    - **2.1.1.2:** Develop tree view component with folder expansion and navigation
    - **2.1.1.3:** Implement path resolution and navigation services
    - **2.1.1.4:** Create breadcrumb generation for hierarchical navigation
    - **2.1.1.5:** Build dashboard view showing project overview and recent activity

  - **2.1.2: Version History Visualization**
    - **2.1.2.1:** Implement Git log retrieval and parsing with in-memory database integration
    - **2.1.2.2:** Create timeline visualization components for document history
    - **2.1.2.3:** Develop metadata extraction and display from commit history
    - **2.1.2.4:** Implement efficient history view with pagination for large projects

  - **2.1.3: Project Creation and Management**
    - **2.1.3.1:** Implement project initialization workflow
    - **2.1.3.2:** Create project metadata management
    - **2.1.3.3:** Develop folder structure initialization
    - **2.1.3.4:** Build UI for creating and organizing projects and folders
    - **2.1.3.5:** [HITL TEST POINT] - Verify ability to create projects and folders, ensuring proper Git project initialization and in-memory database updates

- **2.2: Document Rendering**
  - **2.2.1: Markdown Rendering Engine**
    - **2.2.1.1:** Implement server-side Markdown parsing with syntax highlighting
    - **2.2.1.2:** Create HTML sanitization and security filtering
    - **2.2.1.3:** Develop image and asset resolution within Markdown content
    - **2.2.1.4:** Implement caching strategy for rendered content
    - **2.2.1.5:** [HITL TEST POINT] - Verify that Markdown documents with complex elements (tables, code blocks, images) render correctly and that the caching system properly invalidates when source files change

  - **2.2.2: Diff Visualization**
    - **2.2.2.1:** Create Git diff retrieval and parsing system
    - **2.2.2.2:** Implement visual diff rendering for text-based files
    - **2.2.2.3:** Develop side-by-side and inline diff modes
    - **2.2.2.4:** Create syntax highlighting for diffed content
    - **2.2.2.5:** Implement diff comparisons between assets and their derived artifacts

  - **2.3: Asset and Artifact Management**
    - **2.3.1: File Preview System**
      - **2.3.1.1:** Implement preview generators for required formats (HTML, PDF, DOCX)
      - **2.3.1.2:** Create thumbnail generation service with caching
      - **2.3.1.3:** Develop streaming for large files and media
      - **2.3.1.4:** Implement lazy loading for performance optimization

    - **2.3.2: Download Service**
      - **2.3.2.1:** Create secure download endpoints with permission validation
      - **2.3.2.2:** Set up content disposition and MIME type detection
      - **2.3.2.3:** Implement download capability for all required file formats

    - **2.3.3: Artifact Generation**
      - **2.3.3.1:** Create workflow to generate artifacts from source assets (MD → HTML, PDF, DOCX)
      - **2.3.3.2:** Implement Pandoc integration for document format conversion
      - **2.3.3.3:** Develop caching system for generated artifacts
      - **2.3.3.4:** Create invalidation triggers for source file changes
      - **2.3.3.5:** Build UI components for requesting and managing artifact generation
      - **2.3.3.6:** [HITL TEST POINT] - Verify artifact generation workflow by testing conversion between formats and confirming cache invalidation operates correctly

### Phase 3: Minimal Write Operations and Collaboration

- **3.1: Upload Functionality**
  - **3.1.1: Upload System**
    - **3.1.1.1:** Implement secure file upload with progress tracking
    - **3.1.1.2:** Create file validation for supported formats
    - **3.1.1.3:** Develop metadata extraction from uploaded files
    - **3.1.1.4:** Implement Git commit generation for uploaded assets
    - **3.1.1.5:** [HITL TEST POINT] - Verify that file uploads properly store files in the Git project, generate appropriate metadata, and update the in-memory cache

- **3.2: Collaboration**
  - **3.2.1: Shareable Link System**
    - **3.2.1.1:** Create secure token generation with configurable expiration
    - **3.2.1.2:** Implement role association with shared links
    - **3.2.1.3:** Develop link revocation mechanism
    - **3.2.1.4:** Create minimal usage tracking for shared links
    - **3.2.1.5:** [HITL TEST POINT] - Verify that shareable links can be created with different permission levels, used to access content appropriately, and revoked when necessary

### Phase 4: Testing and Security

- **4.1: Security Validation**
  - **4.1.1:** Conduct comprehensive penetration testing
  - **4.1.2:** Implement automated security scanning
  - **4.1.3:** Review permission enforcement across all endpoints
  - **4.1.4:** Conduct secure code review and dependency auditing
  - **4.1.5:** [HITL TEST POINT] - Verify that security testing has been completed, vulnerabilities have been addressed, and access controls are enforced correctly across all endpoints

## Technical Specifications

### Core APIs and Data Structures

1. **Project Access API**
   ```
   GET /api/v1/projects                 # List all projects
   GET /api/v1/projects/:projectId      # Get project details, immediate files (assets and artifacts)
   GET /api/v1/projects/:projectId/:fileId # Get details and immediate files for specified fileId (includes path and filename)
   GET /api/v1/projects/:projectId/:fileId/history # Get file history
   GET /api/v1/projects/:projectId/:fileId1#:revision1/diff/:fileId2#:revision2 # Compare any two files or versions
   ```

2. **Asset and Artifact Relationship**
   ```json
   {
     "source": "document.md",
     "artifacts": [
       {
         "path": "document.pdf",
         "type": "pdf",
         "generated": "2023-05-01T10:30:00Z",
         "generator": "pandoc",
         "config": { "template": "default", "options": ["--toc"] }
       },
       {
         "path": "document.html",
         "type": "html",
         "generated": "2023-05-01T10:30:05Z",
         "generator": "pandoc",
         "config": { "template": "default" }
       },
       {
         "path": "document.docx",
         "type": "docx",
         "generated": "2023-05-01T10:30:10Z",
         "generator": "pandoc",
         "config": { "template": "default" }
       }
     ],
     "dependencies": [
       {
         "path": "images/figure1.png",
         "type": "image",
         "usedIn": ["document.md"]
       }
     ]
   }
   ```

3. **Simplified Permission Model**
   ```json
   {
     "linkToken": "share_token_abc123",
     "path": "/project/docs",
     "role": "read",  // Options: read, contribute, edit
     "created": "2023-05-01T09:00:00Z",
     "expires": "2023-06-01T09:00:00Z",
     "createdBy": "admin"
   }
   ```

4. **Project Management API**
   ```
   POST /api/v1/projects                     # Create new project
   POST /api/v1/projects/:projectId/:fileId  # Create new file/folder
   ```

5. **Asset Upload API**
   ```
   POST /api/v1/projects/:projectId/upload          # Upload new asset
   POST /api/v1/projects/:projectId/:fileId/upload  # Upload new asset to sub-folder (/associate with asset/artifact)
   ```

6. **Artifact Generation API**
   ```
   POST /api/v1/projects/:projectId/:fileId/generate # Generate artifact from source asset/artifact
   ```

7. **Shareable Link API**
   ```
   POST /api/v1/projects/:projectId/links         # Create new shareable link
   POST /api/v1/projects/:projectId/:fileId/links # Create new shareable link to sub-folder (/associate with asset/artifact)
   GET /api/v1/projects/:projectId/links          # List active shareable links
   GET /api/v1/projects/:projectId/:fileId/links  # Get shareable link details
   GET /api/v1/projects/:projectId/:linkId        # Get shareable link details
   DELETE /api/v1/projects/:projectId/:linkId     # Revoke shareable link
   ```

8. **Download API**
   ```
   GET /api/v1/projects/:projectId/:fileId/download # Download file with proper content type
   ```

### In-Memory Database Schema

```typescript
// Project structure
interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  rootFolder: Folder;
}

// Folder structure
interface Folder {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  children: Array<Folder | File>;
  createdAt: Date;
  updatedAt: Date;
}

// File structure
interface File {
  id: string;
  name: string;
  path: string;
  mimeType: string;
  size: number;
  isArtifact: boolean;
  sourceId?: string; // If artifact, reference to source file
  artifacts?: string[]; // If source, references to generated artifacts
  dependencies?: string[]; // References to files this file depends on
  lastCommit: {
    hash: string;
    message: string;
    author: string;
    date: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Shareable link
interface ShareableLink {
  id: string;
  token: string;
  projectId: string;
  path: string;
  role: "read" | "contribute" | "edit";
  createdAt: Date;
  expiresAt: Date | null;
}
```
  
  