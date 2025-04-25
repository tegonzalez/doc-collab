<!--
Directive: Do not add a "Next Steps" section to this document.
Derive next steps by reviewing this progress file (last steps completed)
and cross-referencing with the design goals in `mvp.md`.
-->

# Project Progress Report

This document tracks the progress made, technical details implemented, design clarifications, and learnings during the development session, referencing the `docs/mvp.md` plan where applicable.

## Session 1: Initial Setup & Foundation (Pre-commit fa7f7c)

### Overall Status

*   Initial UI refactoring complete based on user request (Floating Toolbar, new Dashboard layout, Settings page).
*   Phase 1.1 (Foundation Setup - Containerization & Git Backend) tasks initiated and files created.
*   Phase 1.2 (Server Implementation) tasks initiated, placeholders created.
*   **Awaiting user confirmation for HITL Test Point 1.2.1.5 (Git clone/push verification via SSH).**

### UI/UX Refactoring (User-Driven Change)

Significant changes were made to the UI/UX based on user requirements, deviating from the initial simple sidebar structure:

*   **Requirement:** Replace collapsible sidebar with a floating, vertical toolbar (icon-width) containing navigation icons (Close, Dashboard, Settings) with tooltips. Toolbar should remain open until explicitly closed. Settings page (`/settings`) for user profile/SSH keys. Dashboard (`/`) restructured into collapsible sections (Activity, Tree, Upload).
*   **Implementation:**
    *   Removed existing `SidebarProvider`, `Sidebar`, and `SidebarTrigger` components and integration (`src/app/page.tsx`, `src/components/ProjectExplorer.tsx`).
    *   Created `src/components/ui/FloatingToolbar.tsx` using `react`, `framer-motion` (dependency added), and `lucide-react` icons.
        *   Includes state management for open/closed state.
        *   Uses `next/navigation` for routing.
        *   Implements `Tooltip` from `shadcn/ui`.
        *   Overlays Open/Close buttons for smooth animation.
    *   Integrated `<FloatingToolbar />` into the root layout (`src/app/layout.tsx`).
    *   Created `src/app/settings/page.tsx` with basic `Card` components for "Profile" (Display Name) and "SSH Public Keys" management placeholders.
    *   Restructured `src/components/ProjectExplorer.tsx` (now serving as the Dashboard at `/`) to use `Accordion` from `shadcn/ui` for "Activity", "Project Tree", and "Upload" sections. Added basic content/placeholders to these sections.

### Phase 1.1: Foundation Setup (Containerization & Git Backend)

Tasks related to `mvp.md` section 1.1 initiated:

*   **1.1.1: Kubernetes Container Configuration:**
    *   **Files Created:**
        *   `.dockerignore`: Excludes unnecessary files (`node_modules`, `.git`, `.next`, etc.) from build context.
        *   `Dockerfile`: Multi-stage Dockerfile using `alpine:3.19`.
            *   Installs Node.js (v20 via NVM), Git, Pandoc, SQLite, OpenSSH, sudo.
            *   Stage 1: Installs dependencies.
            *   Stage 2: Builds the Next.js application (`npm run build`, `npm prune --production`).
            *   Stage 3: Creates final production image.
                *   Adds non-root user (`collabflow`).
                *   Copies built app artifacts.
                *   Copies helper scripts (`docker/`).
                *   Configures `sshd` (disable root/password login, enable pubkey, set `AuthorizedKeysFile` path).
                *   Generates SSH host keys (`ssh-keygen -A`).
                *   Sets non-root user (`USER collabflow`).
                *   Configures `sudo` to allow `collabflow` user to run `/usr/sbin/sshd` without password.
                *   Exposes ports 3000 (HTTP) and 22 (SSH).
                *   Defines `VOLUME`s for `/app/projects`, `/app/data`, `/app/.ssh`.
                *   Sets `ENTRYPOINT` to `docker/entrypoint.sh`.
        *   `docker-compose.yml`: For simplified local build/run.
            *   Defines `collabflow` service.
            *   Maps ports (host:container) `3000:3000`, `2222:22`.
            *   Sets basic environment variables.
            *   Defines named volumes (`collabflow_projects`, `collabflow_data`, `collabflow_ssh_keys`).
*   **1.1.2: Git Backend Implementation:**
    *   **Files Created:**
        *   `docker/setup_git.sh`: Script run by entrypoint.
            *   Creates Git project root (`/app/projects`) if needed.
            *   Initializes a bare repository (`main-project.git`) if it doesn't exist.
            *   Creates placeholder Git hooks (`pre-receive`, `post-receive`) with basic logging. `post-receive` includes a commented-out `curl` example for triggering cache invalidation.
            *   Ensures `.ssh/authorized_keys` file exists with correct permissions.
        *   `docker/entrypoint.sh`: Manages container startup.
            *   Runs `setup_git.sh`.
            *   Starts `sshd` in the background using `sudo`.
            *   Executes the command passed to the container (defaults to `npm run start`). Handles `dev` and `bash` commands explicitly.
    *   **README Update:** `README.md` updated with technical instructions for containerized and non-containerized setup, prerequisites, build/run commands, and development steps.

### Phase 1.2: Server Implementation

Tasks related to `mvp.md` section 1.2 initiated:

*   **1.2.1: Node.js Express Server Setup (Adapted for Next.js):**
    *   **1.2.1.1 (API Arch):** Created basic health check API route at `src/app/api/health/route.ts`.
    *   **1.2.1.2 (Auth Middleware):** Created `middleware.ts` with placeholder JWT/cookie check logic. Authentication logic itself is deferred to Phase 1.3.1.
    *   **1.2.1.3 (Error Handling/Logging):** Created `src/app/global-error.tsx` for client-side error boundaries. Basic `console.log`/`console.error` added in middleware and error boundary.
    *   **1.2.1.4 (Security Middleware):** Added basic security headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`) in `middleware.ts`. Placeholders noted for rate limiting and advanced headers (CSP).
    *   **1.2.1.5 (HITL TEST POINT):** Instructions provided to the user for manually testing Git clone/push via SSH to verify container setup and hook execution. **Awaiting user confirmation.**
*   **1.2.2 & 1.2.3 (Database & In-Memory Cache):**
    *   Created placeholder directories: `src/lib/db`, `src/lib/git`, `src/lib/cache`.
    *   Created placeholder files:
        *   `src/lib/db/index.ts`: Placeholder for SQLite connection logic.
        *   `src/lib/db/schema.ts`: Placeholder SQL for `users` and `shared_links` tables.
        *   `src/lib/git/interface.ts`: Defined TypeScript interfaces for `Project`, `Folder`, `File`, `CommitInfo`, `ShareableLink` based on `mvp.md`.
        *   `src/lib/git/server.ts`: Placeholder functions for server-side Git operations (`getFileContent`, `getCommitLog`).
        *   `src/lib/cache/manager.ts`: Placeholder logic for building, retrieving, and invalidating the in-memory project cache. Includes basic structure for `initializeCache`, `getProjectFromCache`, `invalidateCache`.

### Learnings & Issues Encountered (Session 1)

*   **Missing Dependency:** UI refactoring introduced a dependency on `framer-motion` which was not installed, causing a module resolution error. Resolved by running `npm install framer-motion`.
*   **Container Permissions (`sshd`):** Clarified that the container `ENTRYPOINT` runs as the non-root user (`collabflow`). Starting `sshd` requires root privileges, necessitating the use of `sudo` within the entrypoint script and configuring `sudoers` in the `Dockerfile` to grant specific permission only for the `sshd` command.

## Session 2: Tree View, Notifications, and Debugging (Post-commit fa7f7c)

### HITL Test Point 1.2.1.5 (Git Access)

*   User confirmed container is running and accessible but couldn't verify Git push/clone as project creation wasn't implemented.

### Tree View Implementation (Phase 1)

*   Installed `react-arborist` library.
*   Created `src/components/ProjectTreeView.tsx` component using `react-arborist`.
*   Implemented initial version with placeholder data and basic node rendering.
*   Implemented state management within the wrapper for the list of projects.
*   Implemented inline editing (`Input` component) for renaming/creating nodes.
*   Added hover actions (Add "+", Rename "Pencil") to tree nodes.

### Notifications Panel Implementation

*   Created `src/components/ui/NotificationsPanel.tsx`.
*   Includes `NotificationsProvider` context and `useNotifications` hook for managing notification state globally.
*   Provides `NotificationsPanel` UI component with a toggle button (Bell icon), unread count badge, scrollable list of notifications, and "Clear All" functionality.
*   Uses `framer-motion` for panel animation.
*   Includes `NotificationItem` component for rendering individual notifications with type-based icons/styling and relative timestamps.
*   Integrated `NotificationsProvider` and `NotificationsPanel` into the root layout (`src/app/layout.tsx`), adding padding to `<main>` to avoid overlap.

### UI Adjustments

*   Moved `FloatingToolbar` from center-left to top-left (`top-4 left-4`) (`src/components/ui/FloatingToolbar.tsx`).

### Build/Runtime Debugging

*   **Issue:** Build failed due to `Unexpected token TooltipProvider` error in `FloatingToolbar.tsx` and potentially `NotificationsPanel.tsx`.
*   **Fix:** Modified both components to import `TooltipPrimitive.Provider` directly from `@radix-ui/react-tooltip` instead of the re-exported `TooltipProvider` from `@/components/ui/tooltip`. Build succeeded after this change.
*   **Issue:** Server preview unreachable in Firebase Studio despite successful build. User suspected port issues (initially mentioned changing to 8080).
*   **Analysis:** Identified that the IDE likely runs `npm run dev`, which hardcoded port 9002 in `package.json`, overriding any `.env` settings for that specific script. The IDE's port forwarding likely expected the default port (3000) or the specified one (9002). Docker configuration was determined to be irrelevant for the IDE's dev preview.
*   **Resolution Attempt:** Proposed changing `dev` script port back to 3000. User rejected this, stating `package.json` hadn't changed recently and the issue stemmed from commit `fa7f7c` (the Tree/Notifications implementation).
*   **Revised Analysis:** Concluded the issue was likely a runtime error introduced in commit `fa7f7c` (in `ProjectTree` or `NotificationsPanel`) preventing the dev server from starting successfully, even though the build passed. Emphasized the need to check runtime server logs in the IDE.
*   **User Resolution:** User resolved the server reachability issue independently by inititating a "hard reset" (details not specified, possibly related to IDE state or runtime error fix).

### Learnings & Design Directives (Session 2)

*   **IDE Port Forwarding:** Cloud IDEs (like Firebase Studio) manage port forwarding for previews. Application configurations need to align with the IDE's expected port (specified in the dev script like 9002). Docker port mappings don't affect the IDE's native preview runner.
*   **Build vs. Runtime Errors:** `npm run build` catches syntax/type errors but doesn't guarantee the application will run. Runtime errors (e.g., React hook errors, invalid state, component lifecycle issues) occur when the server attempts to start or render, requiring inspection of runtime logs (`npm run dev` output).
*   **Component Export/Import Issues:** Re-exporting components (like `TooltipProvider`) can sometimes cause unexpected JSX parsing issues during build; importing primitives directly can resolve this.
*   **Tree Component Rendering (`react-arborist`):** Learned that `react-arborist` expects an array of root-level nodes. Rendering a single, static, non-data root requires rendering it manually outside the `<Tree>` component and passing the actual data array (projects) to the `<Tree>` component.
*   **Tree View:**
    *   Use a modern tree view (`react-arborist` chosen).
    *   Support icons, buttons, badges, inline renaming.
    *   Support dynamic loading (children fetched on demand).
    *   Root level is a conceptual, static "Projects" entry (rendered manually).
    *   The "+" button on the "Projects" root creates new projects.
    *   The "+" button on project/folder nodes creates folders/items inside them.
    *   No modals for interaction; use inline editing and notifications.
    *   Validation errors (empty name, invalid chars, duplicates etc.) should appear in the Notifications panel, and the corresponding tree input should highlight red and retain focus.
*   **Notifications:**
    *   Implement a dropdown panel from the top-right.
    *   Trigger button shows unread count badge.
    *   Notifications are invasive. They are reserved for highly important and helpful messages. Use logs for informational. They must be human-readable, brief yet technically detailed, and clearly inform the user.
*   **Project Creation Workflow:**
    *   Adding a project via the Tree view must trigger a backend task.
    *   This task eventually runs `git init --bare` for the new project.
    *   The tree view should show a "pending" or "creating" state for the project until the task completes.
    *   Task completion should trigger a notification and update the project's visual state in the tree (e.g., from italic/pending to normal/ready).
*   **Backend Task Queue:**
    *   All shell commands or long-running operations triggered by the server (like `git init`, `pandoc`) must be dispatched to an application-wide task queue.
    *   Tasks must run as an unprivileged user within the container.
    *   The queue should support progress tracking (for future use, e.g., Pandoc progress) and completion status reporting (via Notifications).
