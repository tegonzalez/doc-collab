<!--
Directive: Do not add a "Next Steps" section to this document.
Derive next steps by reviewing this progress file (last steps completed)
and cross-referencing with the design goals in `docs/mvp.md`.
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
    *   **Directive Clarification:** Notifications should *not* be used for routine, expected actions like successful file deletions or simple UI state changes. Their primary use is for significant events: validation errors, background task completions (success or failure), or critical system alerts.
*   **Project Creation Workflow:**
    *   Adding a project via the Tree view must trigger a backend task.
    *   This task eventually runs `git init --bare` for the new project.
    *   The tree view should show a "pending" or "creating" state for the project until the task completes.
    *   Task completion should trigger a notification and update the project's visual state in the tree (e.g., from italic/pending to normal/ready).
*   **Backend Task Queue:**
    *   All shell commands or long-running operations triggered by the server (like `git init`, `pandoc`) must be dispatched to an application-wide task queue.
    *   Tasks must run as an unprivileged user within the container.
    *   The queue should support progress tracking (for future use, e.g., Pandoc progress) and completion status reporting (via Notifications).

## Session 3: Tree View Refinement

*   **Tree View Issues:**
    *   Visual styling of tree view and inline edit textbox needs improvement.
    *   Inline edit box for new projects appears incorrectly formatted (icon, default name, textbox with default name again) instead of `<icon/> <textbox value='Untitled'/>`.
    *   Project name validation on submit (empty, invalid characters, duplicates) is missing.

## Session 4: Authentication System Fixes

### Authentication Issues (Edge Runtime Compatibility)

*   **Issue:** Authentication was broken due to incompatibility between `jsonwebtoken` and Next.js Edge Runtime.
*   **Error Detail:** The middleware was failing with the error: "The edge runtime does not support Node.js 'crypto' module."
*   **Root Cause:** Next.js middleware runs in Edge Runtime, which doesn't support Node.js native modules like `crypto` that are used by `jsonwebtoken`.
*   **Implementation:**
    * Replaced `jsonwebtoken` with `jose` (an isomorphic JWT library compatible with Edge Runtime)
    * Installed jose package: `npm install jose@6.0.10 --save-exact`
    * Updated middleware, validate route, and admin link generator to use jose
    * Fixed userId type handling to ensure consistent integer representation

### Authentication Design & Implementation

*   **Link Token Authentication:**
    *   Uses a secure, one-time authentication link system (no username/password)
    *   Admin login links expire in 1 minute for security (changed from previous 7-day expiration)
    *   Links are generated via the `generate-admin-link.mjs` script
    *   Links validated via `/api/auth/validate` API route
    *   Database record for tokens deleted after successful use

*   **Session Management:**
    *   After link validation, creates a JWT session token containing only the user ID
    *   Session cookies expire after 3 days (reduced from 7 days for security)
    *   Cookies set with proper security attributes (httpOnly, secure in production, sameSite)
    *   Uses the same shared JWT_SECRET across the application (configurable via environment variable)

*   **Protected Routes:**
    *   Middleware intercepts all requests to check for valid session cookies
    *   Unprotected paths explicitly defined: '/', '/auth/error', '/api/auth/validate', '/api/health'
    *   Invalid or missing sessions redirect to the home page
    *   User ID added to request headers for downstream API routes

*   **Error Handling:**
    *   Created dedicated `/auth/error` page to display authentication errors
    *   Uses URL parameters to pass error messages between routes
    *   Provides clear, user-friendly error messages and a return link

*   **Welcome Experience:**
    *   Added welcome parameter to dashboard redirect after successful authentication
    *   Created welcome alert banner on dashboard that auto-dismisses after 10 seconds
    *   Implemented welcome notification in the notifications panel
    *   Improves UX by confirming successful authentication

### Data Handling Improvements

*   **Type Safety:**
    *   Added explicit userId parsing to ensure consistent integer handling (`parseInt(userId.toString(), 10)`)
    *   Fixed issue where SQLite integer IDs were being treated as floats in JS/TS
    *   Updated all authentication-related code to maintain consistent userId types

*   **Date/Time Handling:**
    *   All database dates are stored in UTC ISO 8601 format
    *   Added explicit UTC date comparisons for token expiration checks
    *   Added debugging logs for comparing timestamps
    *   Client-side timestamps displayed in local timezone

### UI Enhancements

*   **Dashboard Page:**
    *   Improved layout with a grid of cards for key dashboard sections
    *   Added welcome alert for newly authenticated users
    *   Integrated ProjectExplorer component 

*   **Auth Error Page:**
    *   Created dedicated error page with consistent styling
    *   Uses shadcn/ui components for consistent look and feel
    *   Displays clear error messages passed via URL parameters

*   **Splash Page:**
    *   Added clarification about authentication redirect
    *   Improved instructions for first-time users

### Learnings & Design Decisions

*   **Edge Runtime Compatibility:**
    *   Next.js middleware requires isomorphic libraries compatible with Edge Runtime
    *   Standard Node.js crypto modules are not available in Edge Runtime
    *   Jose library provides a compatible alternative to jsonwebtoken

*   **Data Type Consistency:**
    *   SQLite stores userId as INTEGER but JavaScript might interpret as float (e.g., "1.0")
    *   Explicit type conversion (`parseInt()`) is necessary to ensure consistent type handling
    *   All userId values should be parsed to integers before use, especially for JWT payloads

*   **Security Considerations:**
    *   Admin login links lifespan reduced to 1 minute (was 7 days)
    *   Session duration reduced to 3 days (was 7 days)
    *   One-time use tokens deleted immediately after use
    *   No plaintext passwords stored anywhere in the system

*   **User Experience Priority:**
    *   Welcome notifications and banners improve the authentication experience
    *   Clear error messages help users understand authentication issues
    *   Consistent styling across auth-related pages enhances professionalism

*   **Future Authentication Scalability:**
    *   The authentication system is designed to support multiple users
    *   Display names retrieved from database, not hardcoded in JWT
    *   System ready for future enhancements like email-based authentication

## Session 5: Git SSH ACL and Project Creation

### Git SSH Access Control (ACL)

*   **Goal:** Implement fine-grained access control for Git operations over SSH based on user keys and database permissions.
*   **Implementation:**
    *   Created `docker/git-auth-wrapper.sh`: A script executed by `sshd` (via `authorized_keys` `command=`) to act as a gatekeeper.
        *   Takes the `key_id` provided by `sshd`.
        *   Queries the SQLite database (`user_ssh_keys`, `ssh_permissions`) to find associated `user_id`(s) and their permissions (`R`, `RW`, `RW+`) for specific projects.
        *   Parses the `SSH_ORIGINAL_COMMAND` (e.g., `git-upload-pack 'projecthash.git'`, `git-receive-pack 'projecthash.git'`, or `list-repositories`).
        *   For `list-repositories`: Lists accessible repositories (names and highest permission level) for the user(s).
        *   For Git commands: Validates the requested repository format (SHA256 hash + `.git`), checks if the user(s) have sufficient permission for the requested operation (Read for `upload-pack`, Write for `receive-pack`), and sets environment variables (`GIT_SSH_PERMISSION_LEVEL`, `GIT_SSH_USER_IDS`) for the hook.
        *   If authorized, `exec`s the appropriate Git command (`git-upload-pack`, `git-receive-pack`) targeting the correct bare repository path.
        *   If unauthorized or command is invalid, logs an error and exits.
    *   Created `docker/git-pre-receive-hook.sh`: A standard Git hook executed by `git-receive-pack` before accepting pushed refs.
        *   Reads `GIT_SSH_PERMISSION_LEVEL` set by the wrapper script.
        *   Enforces rules based on permission level:
            *   Ref Deletion (`newrev` is all zeros): Requires `RW+`.
            *   Ref Creation (`oldrev` is all zeros): Requires `RW` or `RW+`.
            *   Non-Fast-Forward Push (potential force push): Requires `RW+`.
        *   If any check fails, logs an error and exits non-zero to reject the push.
    *   Updated `docker/setup_git.sh`:
        *   Copies the new ACL scripts (`git-auth-wrapper.sh`, `git-pre-receive-hook.sh`) to a scripts directory within the container.
        *   Sets appropriate execute permissions.
        *   Updates logic to symlink the `git-pre-receive-hook.sh` into the `hooks` directory of existing and newly created bare repositories.
    *   **Note:** The `authorized_keys` file generation (linking `key_id` to the wrapper script) is handled by application logic (not shown in this diff).

### Project Creation API & Task

*   **Goal:** Allow authenticated users to create new projects via the API, triggering background Git repository initialization.
*   **Implementation:**
    *   Updated `src/app/api/projects/route.ts` (POST handler):
        *   Requires authenticated user (extracts `x-user-id` header set by middleware).
        *   Generates a unique `projectId` (UUID).
        *   Generates a repository hash (`repoHash`, SHA256 of user ID + project ID) to create a unique, non-guessable directory name (`<repoHash>.git`).
        *   Creates manifest data (user ID, project ID, project name, timestamp).
        *   Enqueues a new task type `CREATE_GIT_REPO_WITH_MANIFEST` with a payload containing all necessary information (user ID, project ID/name, repo hash/path, manifest content).
        *   Returns `202 Accepted` with the `taskId` and `projectId`.
    *   Created `src/lib/queue/handlers/createGitRepoHandler.ts`:
        *   Defines `handleCreateGitRepoWithManifest` function to process the new task type.
        *   Creates a temporary directory.
        *   Initializes a standard Git repo inside the temp dir.
        *   Writes the `manifest.json` file.
        *   Commits the `manifest.json` file (with generic Git user config).
        *   Initializes the final *bare* repository at the specified `repoPath`.
        *   Links the standard Git hooks (e.g., `pre-receive`) into the bare repo's hooks directory.
        *   Pushes the initial commit from the temporary repo to the bare repo.
        *   Cleans up the temporary directory.
        *   Includes basic error handling and logging.

### Minor Fixes & Refinements

*   `src/components/ProjectTreeView.tsx`: Corrected TreeApi import type, refined editing state logic, improved node deletion handling using `tree.delete()` and passing down a memoized `filterOutNode` function.
*   `src/lib/db/index.ts`: Corrected `better-sqlite3` instantiation using `Sqlite.default` and type assertion for the constructor to align with type definitions.
*   Removed unused imports/variables and addressed ESLint warnings in various files.
*   Corrected typos and improved clarity in comments and log messages (e.g., `apos;` in `page.tsx`).

### Learnings & Design Decisions

*   **Git SSH Security:** Using the `command=` directive in `authorized_keys` with a wrapper script provides a robust way to intercept and authorize SSH Git commands based on application-specific logic (database lookups) before Git itself is invoked.
*   **Git Hooks for Finer Control:** Pre-receive hooks allow enforcement of push policies (like preventing force pushes or deletes) based on the permissions determined by the wrapper script.
*   **Project Repo Naming:** Using a hash based on user ID and project ID for the repository directory name provides uniqueness and avoids potential collisions or filesystem issues with user-provided names.
*   **Task Queue for Repo Creation:** Creating a Git repository involves multiple filesystem and potentially time-consuming operations. Offloading this to a background task queue (`CREATE_GIT_REPO_WITH_MANIFEST`) keeps the API request fast and handles the process asynchronously.
*   **Initial Commit:** Creating an initial commit with a `manifest.json` file ensures the bare repository is not empty and contains essential project metadata from the start.
*   **TypeScript/Library Integration:** Careful attention is needed for specific library imports and instantiation, especially when dealing with type definitions and potential differences between CommonJS/ESM (`better-sqlite3` example).
