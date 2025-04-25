# Single Instance Implementation Plan

## Key Learnings & Design Directives

This section distills essential learnings and design decisions from the project's development history that remain relevant to the single-instance implementation.

### Authentication System
- **JWT Authentication**: The system uses secure, one-time authentication links instead of username/password
- **Admin Link JWT**: Generated exclusively via CLI tool (`npm run gen-admin-link`) with 1-minute expiration
- **User Link JWT**: Generated via web application for collaborators with 3-day expiration
- **Session JWT**: Persists for 10 years via secure cookies with appropriate security attributes
- **App Seed Security**: All JWTs must be invalidated if the database is reset or compromised; app seed provides this security mechanism
- **Clean Sign-Out**: Users must be able to explicitly end their sessions via the Settings page
- **JWT Structure**: Each token type (Admin Link, User Link, Session) must have clear type indicators and appropriate expirations

### Git Integration
- **Git as Source of Truth**: The Git filesystem is the authoritative source for all project content
- **SSH ACL System**: Fine-grained access control (R, RW, RW+) is managed through SSH authorized_keys and Git hooks
- **Repository Structure**: Each project exists as a bare Git repository with a unique hash-based name for security
- **Cache Invalidation**: Git hooks must trigger task queue jobs to update the LokiJS cache when repository content changes
- **Repository Creation**: Projects are created as bare Git repositories with an initial commit containing a manifest.json file

### Task Queue Architecture
- **Background Processing**: All shell commands or long-running operations must be dispatched to an application-wide task queue
- **Task Types**: Specialized handlers exist for different task types (e.g., `CREATE_GIT_REPO_WITH_MANIFEST`)
- **Security Model**: Tasks must run as an unprivileged user within the container
- **Completion Notifications**: Task completion should trigger appropriate user notifications

### UI/UX Patterns
- **Floating Toolbar**: Navigation uses a floating, vertical toolbar (icon-width) with tooltips replacing the sidebar approach
- **Dashboard Structure**: Dashboard organized into collapsible sections (Activity, Tree, Upload)
- **Error Display**: Consolidated error handling with context-based messaging for all error types
- **Tree View**: Dynamic tree view for project navigation with efficient loading patterns
- **Notifications System**:
  - Notifications are considered an intrusion for users and should be used sparingly
  - Only truly important feedback that requires user attention should trigger notifications
  - Routine successes, expected actions, and background operations should NOT generate notifications
  - Notifications must be human-readable, brief yet technically detailed
  - All notifications flash as a banner for 10 seconds in the top right (next to panel button) when panel is collapsed
  - When notification panel is expanded, notifications appear directly in the panel without banner display
  - Valid notification cases include: successful authentication (welcome), validation errors, critical system alerts, background task failures
  - Use logging (not notifications) for routine operations, debugging, and non-critical information
  - Notifications panel should display unread count and allow dismissal of notifications
  - Welcome notification after authentication should not mention session expiry (sessions are permanent)

### Database & Caching Strategy
- **Data Separation**: Clear separation between authentication data (SQLite), content (Git), and cached metadata (LokiJS)
- **SQLite Pragmas**: WAL mode enabled for better concurrency and crash recovery
- **Type Consistency**: User IDs must be consistently handled as integers throughout the system
- **Environment Loading**: Configuration loaded from `env` directory with precedence for environment variables

This distilled knowledge captures the essential design patterns and decisions that should guide the implementation of the single-instance architecture without requiring exhaustive review of the progress.md document.

## Current Implementation Overview

The current implementation includes:
- Next.js web application with standard Node.js runtime
- SQLite database for persistence
- JWT-based authentication with permanent sessions
- Git-based project storage with SSH access
- In-memory task queue for background operations

## Critical Priority: Eliminating Edge Runtime

This section addresses a critical implementation decision that must be executed as the first priority before any other changes: completely eliminating Edge Runtime from the application architecture.

### Motivation and Rationale

- **Simplicity**: Single instance implementation must prioritize simplicity and reliability over distribution and scaling
- **Stability**: Edge Runtime causes compatibility issues with essential libraries (crypto, SQLite, LokiJS)
- **Consistency**: Node.js runtime provides a unified execution environment with full access to all required modules
- **Resource Optimization**: Oscillating between Edge and Node.js runtimes has wasted development resources

### Mandatory Execution Requirements

1. **Complete Removal**: Edge Runtime must be fully eliminated from all parts of the application with no exceptions
2. **Zero Compromise**: There is no scenario where Edge Runtime should be reintroduced or partially maintained
3. **Functionality Preservation**: All existing features and capabilities must work identically after migration
4. **Verification Required**: Explicit testing must confirm the complete removal and proper functionality

### Technical Implementation Approach

1. **Configuration Modifications**:
   - Ensure the correct Node.js runtime configuration in `next.config.js`. For current Next.js versions (observed as of project state), this involves setting `nodeMiddleware: true` directly under `experimental`. This forces middleware execution within the standard Node.js environment, granting access to necessary APIs like `fs` and native modules like `better-sqlite3`, resolving previous runtime conflicts.
   ```javascript
   // next.config.js
   module.exports = {
     // Explicitly set middleware to use Node.js runtime
     experimental: {
       nodeMiddleware: true 
     }
   }
   ```
   *Note: The nested `experimental.middleware.nodeMiddleware` structure previously mentioned was found to be invalid for the current Next.js version.*

2. **Runtime Declarations**:
   - Add explicit Node.js runtime declarations (`export const runtime = 'nodejs';`) to the middleware file (`src/middleware.ts`) itself and any specific API route handlers that might otherwise default to Edge.
   ```typescript
   // In middleware.ts and relevant API route handlers
   export const runtime = 'nodejs';
   ```

3. **Auth Implementation**:
   - Maintain existing auth implementation that depends on Node.js crypto and SQLite
   - Ensure all JWT validation uses the supported Node.js libraries
   - Keep database-backed sessions with current JWT structure and validation

4. **Database Integration**:
   - Preserve direct database access in middleware
   - Maintain LokiJS cache implementation without changes
   - Continue using file-system based storage approach

### Verification Process

Before proceeding with any other implementation tasks, verify Edge Runtime removal through these steps:

1. **Code Inspection**:
   - Search for and identify all instances of `export const runtime = 'edge'`
   - Verify Next.js config properly sets Node.js as the runtime
   - Ensure no Edge-specific dependencies remain

2. **Testing Authentication Flow**:
   - Test login, token validation, and session management
   - Verify error handling for invalid tokens
   - Test logout and session termination

3. **Database Access Validation**:
   - Confirm middleware can access SQLite directly
   - Verify LokiJS cache operations work in all contexts
   - Test file system access through middleware

4. **Error Response Testing**:
   - Verify crypto operations work consistently
   - Check database operations complete successfully
   - Ensure no "unsupported in runtime" errors occur

5. **Documentation**:
   - Update technical documentation to reflect Node.js-only runtime
   - Remove any Edge Runtime references from docs
   - Document the decision and rationale

### Benefits of Node.js-Only Approach

- **Reliability**: Full support for all required Node.js modules and libraries
- **Simplicity**: Single runtime execution model throughout the application
- **Maintainability**: Simpler architecture with fewer edge cases and conditional behaviors
- **Development Efficiency**: Eliminate time spent resolving Edge Runtime compatibility issues
- **Consistency**: Same behavior in development and production environments
- **Future-Proofing**: Node.js runtime provides better long-term stability for the application's needs

### Proceed Only After Verification

This is a mandatory prerequisite for all other implementation work. No other changes should be started until this migration is complete and verified. The removal of Edge Runtime is not optional and must be confirmed before proceeding.

## Implementation Goals

1. Consolidate environment configuration into a `env` directory structure
2. Implement proper app seed management through the environment
3. Fix JWT authentication issues in the current implementation
4. Implement LokiJS-based in-memory cache for fast metadata access
5. Update health endpoint to provide comprehensive system status
6. Align route structure for consistency and security

## Migration Plan

### Phase 1: Environment Configuration Restructuring

1. **Create `env` Directory Structure**
   - Create the `env` directory at project root
   - Create separate environment files:
     - `env/app.env`: Core application settings
     - `env/database.env`: Database connection parameters
     - `env/security.env`: Security parameters and secrets
     - `env/git.env`: Git-related configuration

2. **Implement Environment Loading**
   - Create a centralized environment loader in `src/lib/env.ts`
   - Load and merge all environment files at application startup
   - Implement environment variable precedence (env vars > env files)
   - Add validation for required environment variables

3. **Move App Seed to Environment**
   - Relocate JWT_SECRET and app seed from database to `env/security.env`
   - Create `APP_SEED` and `JWT_SECRET` environment variables
   - Update auth system to read app seed from environment instead of database

### Phase 2: Authentication System Fixes

1. **Fix JWT Implementation**
   - Update token generation to use consistent JWT structure for all three token types
   - Ensure proper token validation across all components using Node.js crypto libraries
   - Remove edge runtime considerations (focus on standard Node.js)
   - Implement proper error handling for authentication failures

2. **Standardize Session Management**
   - Update middleware to use the corrected JWT validation
   - Ensure proper cookie security attributes (httpOnly, secure, sameSite)
   - Maintain 10-year persistence for Session JWT cookies
   - Clarify public vs. protected routes in middleware

3. **Standardize JWT Token Types**
   - Clearly define and implement three token types:
     - Admin Link JWT: One-time use with 1-minute expiration, generated via CLI
     - User Link JWT: One-time use with 3-day expiration, generated via web application
     - Session JWT: 10-year persistence in secure cookies, created after successful authentication

4. **Fix Welcome Experience**
   - Repair broken welcome notification implementation after successful authentication
   - Ensure welcome parameter is properly passed after login flow (`?welcome=true`)
   - Implement consistent notification display pattern (flash banner for 10 seconds if panel collapsed)
   - Add welcome notification to notification panel that persists until dismissed
   - Update welcome messaging to remove references to session expiration

### Phase 3: LokiJS In-Memory Cache Implementation

1. **Design LokiJS Cache Structure**
   - Create a module-based cache system in `src/lib/cache/index.ts` using LokiJS
   - Implement optimized collections for storing:
     - Project tree metadata (with indexing on id, name)
     - File metadata (with indexing on path, projectId)
     - User activity and recents (with indexing on userId, timestamp)
   - Configure LokiJS for optimal performance:
     - Enable binary-serialized persistence for faster load/save
     - Configure auto-save intervals for crash recovery
     - Set up appropriate indexing for all collections

2. **Implement Cache Operations**
   - Create cache initialization function to hydrate from Git filesystem
   - Implement dynamic views for frequent query patterns
   - Set up cache invalidation triggered by Git hooks
   - Add observables/events for real-time cache updates
   - Ensure thread-safety for concurrent operations
   - Implement memory usage monitoring and optimization

3. **Connect Cache to API Layer**
   - Update project and file API routes to use LokiJS cache for read operations
   - Implement cached query operations for list/find operations
   - Ensure proper error handling for cache misses with filesystem fallback
   - Add metrics for cache hit/miss rates

### Phase 4: Health Monitoring Enhancement

1. **Extend Health Endpoint**
   - Update `/api/health` route to include:
     - Git filesystem status (HEAD reference)
     - SQLite database connection verification
     - LokiJS cache status (document count, last update timestamp)
     - Task queue metrics
     - System resource usage

2. **Implement Logging Improvements**
   - Add structured logging with severity levels
   - Include request tracing for better debugging
   - Log critical operations (auth, Git operations)
   - Ensure proper error logging with stack traces

### Phase 5: Route Structure Alignment

1. **Standardize API Routes**
   - Review and align all API routes to follow consistent patterns
   - Implement proper error response formatting
   - Add request validation for all API endpoints
   - Update documentation for API endpoints

2. **Update Page Routes**
   - Ensure proper authentication checks for protected pages
   - Redirect unauthenticated users appropriately
   - Update navigation components to reflect route structure
   - Add appropriate page metadata

3. **Consolidate Error Pages**
   - Migrate from separate error pages to a single unified `/error` page:
     - Consolidate `/auth/error` functionality into `/error` with appropriate query parameters
     - Update all auth error redirects to use the consolidated `/error` route
     - Ensure error page can handle different error types (auth, not found, server error) via context
     - Create consistent error display components that adapt based on error type parameter
     - Maintain backward compatibility during transition period with appropriate redirects
   - Create proper Next.js error pages (500.js, 404.js) that redirect to the unified error page with appropriate context

## Implementation Details

### Data Sources

The application will use three distinct data sources, each with a clear responsibility:

1. **db (SQLite)**: 
   - Persistent storage for structured data
   - Handles user accounts, authentication, permissions
   - Stores application settings and configuration
   - Maintains relationships between entities
   
2. **cache (LokiJS)**:
   - In-memory document database for fast access to frequently used data
   - Stores hydrated metadata from Git filesystem
   - Optimized with indexes for rapid querying
   - Single source of truth for UI data layers
   
3. **filesystem (Git)**:
   - Content storage using Git repositories
   - Authoritative source for all project content
   - Provides version history and collaboration features
   - Accessed via Git operations and filesystem APIs

### Environment Configuration

The `env` directory structure will follow this pattern:

```
./env/
  ├── app.env         # NODE_ENV, PORT, LOG_LEVEL
  ├── database.env    # DATABASE_URL, SQLITE_PRAGMAS
  ├── security.env    # APP_SEED, JWT_SECRET
  └── git.env         # GIT_PROJECT_ROOT, GIT_HOOKS_DIR
```

Environment variables will be loaded at application startup and made available throughout the application.

### Route Structure

To achieve a clean and consistent route architecture, the following changes must be implemented:

1. **Error Route Consolidation**
   - Current state: Separate `/auth/error` and potential general error pages
   - Target state: Single unified `/error` route with error type parameter
   - Migration: Create unified error handler, update all redirects, implement context-based display

2. **Page Organization**
   - Current state: Mixed structure for project routes
   - Target state: Consistent nesting under `/projects` and `/settings`
   - Migration: Create proper nested route handlers, add redirects for backward compatibility

3. **API Versioning Preparation**
   - Current state: Direct API routes without version
   - Target state: Route structure ready for potential future versioning
   - Migration: Ensure API design follows consistent patterns for future flexibility

After implementing these changes, the final route structure will be:

| Type | Route | Method | Purpose | Auth Required | Notes |
|------|-------|--------|---------|--------------|-------|
| **Page** | `/` | GET | Landing/Splash page | No | Redirects to dashboard if authenticated |
| **Page** | `/dashboard` | GET | Main application dashboard | Yes | Primary user interface |
| **Page** | `/settings` | GET | User settings and configuration | Yes | Profile, SSH keys, account settings |
| **Page** | `/error` | GET | Unified error page | No | Handles all error types via query params |
| **Page** | `/projects/:id` | GET | Project detail view | Yes | View and edit specific project |
| **Page** | `/projects/:id/files/:path*` | GET | File view/edit | Yes | View and edit specific file |
| **API** | `/api/health` | GET | System health check | No | Monitor system status |
| **API** | `/api/auth/validate` | GET | Validate auth tokens | No | Process one-time login links |
| **API** | `/api/auth/signout` | POST | End user session | Yes | Logout functionality |
| **API** | `/api/projects` | GET | List all projects | Yes | Retrieves from LokiJS cache |
| **API** | `/api/projects` | POST | Create new project | Yes | Enqueues Git filesystem task |
| **API** | `/api/projects/:id` | GET | Get project details | Yes | Retrieves from LokiJS cache |
| **API** | `/api/projects/:id` | PUT | Update project | Yes | Updates cache and Git filesystem |
| **API** | `/api/projects/:id` | DELETE | Delete project | Yes | Enqueues Git repository deletion task |
| **API** | `/api/projects/:id/files` | GET | List files in project | Yes | Retrieves from LokiJS cache |
| **API** | `/api/projects/:id/files/:path*` | GET | Get file content | Yes | Reads from Git with cache fallback |
| **API** | `/api/projects/:id/files/:path*` | PUT | Update file content | Yes | Updates Git and invalidates cache |
| **API** | `/api/projects/:id/files/:path*` | DELETE | Delete file | Yes | Updates Git and invalidates cache |
| **API** | `/api/projects/:id/history` | GET | Get commit history | Yes | Reads from Git filesystem |
| **API** | `/api/settings/ssh-keys` | GET | List SSH keys | Yes | User's authorized SSH keys |
| **API** | `/api/settings/ssh-keys` | POST | Add SSH key | Yes | Add new authorized key |
| **API** | `/api/settings/ssh-keys/:id` | DELETE | Remove SSH key | Yes | Remove authorized key |
| **API** | `/api/settings/profile` | GET | Get user profile | Yes | User display name and settings |
| **API** | `/api/settings/profile` | PUT | Update profile | Yes | Update user settings |
| **API** | `/api/tasks` | GET | List background tasks | Yes | Admin only - view task queue |
| **API** | `/api/tasks/:id` | GET | Get task status | Yes | Check individual task status |

Note: Next.js also provides built-in error handling via special files (404.js, 500.js, error.js), which will be configured to use our unified error page with appropriate context parameters.

### Authentication System

JWT tokens will follow a consistent structure:

```typescript
// Admin Link JWT
interface AdminLinkJwtPayload {
  type: 'admin_link';
  userId: number;
  exp: number;  // 1-minute expiration
}

// User Link JWT
interface UserLinkJwtPayload {
  type: 'user_link';
  userId: number;
  projectId: string;
  permissions: string;
  exp: number;  // 3-day expiration
}

// Session JWT
interface SessionJwtPayload {
  type: 'session';
  userId: number;
  // No expiration in token - handled by cookie maxAge (10-year)
}
```

### LokiJS Cache Implementation

The cache will be implemented using LokiJS collections with appropriate indexing:

```typescript
// Initialize LokiJS database
const db = new Loki('collabflow-cache.db', {
  autosave: true,
  autosaveInterval: 5000,
  adapter: new LokiMemoryAdapter()
});

// Define collection schemas with indexes
const projects = db.addCollection('projects', {
  indices: ['id', 'userId'],
  unique: ['id'],
  // Optionally persist between restarts
  asyncListeners: true 
});

const files = db.addCollection('files', {
  indices: ['projectId', 'path'],
  // Compound index for fast lookups
  uniqueIndices: ['projectId,path']
});

const userActivity = db.addCollection('userActivity', {
  indices: ['userId', 'timestamp', 'type'],
  // TTL index for automatic cleanup
  ttl: {
    age: 604800000, // 7 days
    ttlInterval: 3600000 // Check every hour
  }
});

// Create efficient cached views for frequent queries
const recentProjectsView = userActivity.getDynamicView('recentProjects');
recentProjectsView.applyFind({ type: 'project_access' });
recentProjectsView.applySort((a, b) => b.timestamp - a.timestamp);

// Cache API
interface CacheManager {
  initialize(): Promise<void>;
  getProject(id: string): ProjectMetadata | null;
  getProjectFiles(projectId: string): FileMetadata[];
  getFile(projectId: string, path: string): FileMetadata | null;
  updateProject(project: ProjectMetadata): void;
  updateFile(file: FileMetadata): void;
  invalidateProject(id: string): void;
  invalidateFile(projectId: string, path: string): void;
  recordActivity(userId: number, type: string, metadata: any): void;
  getStats(): CacheStats;
}
```

### Health Endpoint

The enhanced health endpoint will return:

```json
{
  "status": "ok",
  "timestamp": "2023-05-01T12:34:56Z",
  "version": "1.0.0",
  "git": {
    "status": "ok",
    "head": "abcdef123456"
  },
  "database": {
    "status": "ok",
    "connection": true
  },
  "cache": {
    "status": "ok",
    "lastUpdated": "2023-05-01T12:30:00Z",
    "documents": {
      "projects": 45,
      "files": 1243,
      "userActivity": 789
    },
    "memoryUsage": "24.5MB"
  },
  "queue": {
    "status": "ok",
    "pending": 0,
    "processing": 0,
    "completed": 123,
    "failed": 0
  }
}
```

## Conclusion

This implementation plan focuses on creating a robust single-instance architecture that prioritizes stability, performance, and maintainability. By following these steps and leveraging LokiJS for efficient in-memory caching, we will migrate from the current implementation to the target architecture while ensuring a smooth transition without unnecessary complexity. 
