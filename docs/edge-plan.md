# Full‑Node Technical Augmentation Plan

Addendum to: **mvp.md**
Last updated: 2025‑04‑25

---

## 0. Guiding Principles

1. **Fast things fast** – keep read‑heavy operations local and in‑process.
2. **Zero–DRY authority** – Git‑backed filesystem is the single source of truth for content; cache and DB are conveniences only.
3. **Future‑proof, not premature** – design seams that can be promoted to distributed services when user count demands, but ship a lean single‑container MVP first.
4. **Simplicity over distribution** – prioritize standard Node.js runtime for all components to ensure compatibility and eliminate Edge Runtime complexity.

---

## 1. Data‑Source Responsibilities

| Layer | Purpose | Characteristics | Promotion Path |
|-------|---------|-----------------|----------------|
| **filesystem (Git work‑tree)** | Authoritative store for *assets & artifacts*. Local file I/O, diffs, Pandoc streams. | Local NVMe / PVC mount<br>Git CLI for history<br>No WAL, no network hop | Shard repos across volumes → object store (R2/S3) once > 1 TB |
| **cache (LokiJS)** | Accelerated tree and metadata index, hydrated from Git walker on boot or hook. Project manifests indexed for search/nav. | Document-oriented in-memory DB<br>Dynamic views with indexing<br>Strict invalidation by Git hooks | Move to Redis cluster as RAM pressure or horizontal scaling appears |
| **db (SQLite)** | Security context: admin user, JWT seeds, share‑link ACL, sessions, job metadata. | WAL‐ON, single writer inside pod | Sequelize (pg) ‑compatible schema → Postgres Cloud SQL when HA needed |

---

## 2. Container Topology (MVP)

```text
┌──────────────────────────── Kubernetes Pod ───────────────────────────┐
│                                                                       │
│  ┌─────────────────────┐   IPC/Local fs   ┌──────────────────────┐    │
│  │  Node.js Web/API    │◄────────────────►│   Task Queue Worker   │    │
│  │  (Next.js runtime   │   share cache    │   (queues: git‑ops,   │    │
│  │   standard Node.js) │                  │    pandoc, thumbs)    │    │
│  └──────┬──────────────┘                  └──────────┬───────────┘    │
│         │                 hydrate                     │ git hook msgs │
│  ┌──────▼──────────┐                     ┌───────────▼───────────┐    │
│  │  cache (LokiJS) │  ←── file walker ── │ filesystem (Git PVC)  │    │
│  └─────────────────┘                     └───────────────────────┘    │
│         ▲                                        ▲                    │
│         │                                        │                    │
│         │                ┌────────────┐          │                    │
│         └────────────────┤ db (SQLite)├──────────┘                    │
│                          └────────────┘                               │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

*One process image keeps all three stores in local address space; uses in-memory queue for simplicity in this single-user prototype phase.*

The system uses standard Node.js for the runtime - this is a deliberate design choice for simplicity, better SQLite integration, and easier development workflow.

---

## 3. Authentication & JWT Strategy

| Item | Detail |
|------|--------|
| **App seed** | Stored in `env` directory for security and consistency. Always regenerated on DB reset to provide clean slate. Always private, secret, secure, and shared across services. |
| **Environment configuration** | `env` directory stores all environment configuration:<br>- Core settings (`DATABASE_URL`, `NODE_ENV`, `PORT`)<br>- Secret tokens (JWT signing keys, session salts)<br>- App seed and other security parameters |
| **JWT Lifecycle** | - Admin login links: 1-minute expiration (CLI-generated)<br>- User-generated share links: 3-day validity<br>- Authenticated sessions: 10-year JWT persistence<br>- One-time login tokens for secure access |
| **No usernames/passwords** | Admin obtains magic‑link via CLI tool; collaborators get signed share‑links. |
| **Instance startup** | Reads app seed from `env` directory at runtime, critical for operation. |

---

## 4. Task‑Queue & Background Work

| Implementation | Details | Transition |
|----------------|---------|------------|
| **Single-User Prototype** | Simple in-memory queue manager<br>- Map-based task storage<br>- Single-process architecture<br>- Type-based handlers (e.g., `CREATE_GIT_REPO_WITH_MANIFEST`) | Current implementation, appropriate for early phase |

Task types include:
- `git-ops`: Repository creation, cache invalidation (concurrency: 1)
- `convert`: Pandoc MD→PDF/HTML, thumbnail generation (concurrency: 2 × CPU)
- `notify`: Email/webhook notifications (concurrency: 5)

Future phases will consider distributed task patterns only when actual usage metrics justify the complexity. (eg. BullMQ with ioredis-mock)

---

## 5. External Git SSH Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                        Container                            │
│                                                             │
│  ┌───────────────────┐    ┌─────────────────────────────┐   │
│  │      sshd         │    │           Web App           │   │
│  │    (Git SSH)      │    │          (Next.js)          │   │
│  └───────────────────┘    └─────────────────────────────┘   │
│        ▲          ▲          ▲      ▲              ▲        |
│        │          │          |      |              │        |
│        |          |          ▼      |              │        |
│        |     ┌───────────────────┐  |              │        |
│        |     │    db (SQLite)    │  |              │        |
│        |     └───────────────────┘  |              │        |
│        ▼                            ▼              |        │
│  ┌─────────────────────────────────────┐    ┌─────────────┐ │
│  │      filesystem (Git work-tree)     │───►│    cache    │ │
│  └─────────────────────────────────────┘    │   (LokiJS)  │ │
│                                             └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

Git SSH access operates externally to the web application through dedicated components:

- **Command Gatekeeper**: `git-auth-wrapper.sh` intercepts all SSH commands
  - Triggered via `authorized_keys` command directive
  - Queries SQLite for user permissions (R, RW, RW+)
  - Validates requested repository format and permissions
  - Forwards allowed commands to Git with environment variables set

- **Operation Validator**: `git-pre-receive-hook.sh` ensures Git operation compliance
  - Enforces fine-grained rules based on permission level
  - Prevents unauthorized ref deletion (requires RW+)
  - Blocks non-fast-forward pushes without RW+ permission
  - Applies consistent rules across all access methods

- **Cache Invalidation**: Git hooks trigger task queue jobs to update LokiJS cache
  - Cache data feeds the web application (filesystem → cache → web app flow)
  - No direct web app interaction with Git ACL system
  - Clear separation of concerns for security and maintainability

---

## 6. Startup & Env Management

The `env` directory holds all configuration as separate environment files loaded at runtime:

| File | Purpose | Examples |
|------|---------|----------|
| `env/app.env` | Core application settings | `NODE_ENV`, `PORT`, `LOG_LEVEL` |
| `env/database.env` | Database connection | `DATABASE_URL`, `SQLITE_PRAGMAS` |
| `env/security.env` | Security parameters | `APP_SEED`, `JWT_SECRET` |
| `env/git.env` | Git-related config | `GIT_PROJECT_ROOT`, `GIT_HOOKS_DIR` |

Environment variables take precedence over any configuration files, and all settings are merged at application startup.

---

## 7. Single-Instance Focus and Runtime Architecture

The current implementation phase is strictly focused on a single-instance deployment:

- Single Kubernetes pod containing all components
- Local filesystem for Git repositories
- LokiJS document database for fast in-memory cache
- Simple task queue for background work
- SQLite database for structured data

### Critical Direction: Elimination of Edge Runtime

A critical architectural decision for the single-instance implementation is the complete elimination of Edge Runtime from the application:

1. **Node.js Only Architecture**: 
   - All components (middleware, API routes, pages) must use standard Node.js runtime exclusively
   - No components should use or reference Edge Runtime in any capacity
   - This ensures full compatibility with SQLite, crypto libraries, and filesystem operations

2. **Implementation Requirements**:
   - Update Next.js configuration to force Node.js runtime for middleware:
     ```javascript
     // next.config.js
     module.exports = {
       experimental: {
         middleware: {
           skipMiddlewareUrlNormalize: true,
           nodeMiddleware: true 
         }
       }
     }
     ```
   - Add explicit runtime declarations to relevant files:
     ```typescript
     // Add to middleware and auth routes
     export const runtime = 'nodejs';
     ```

3. **Benefits**:
   - Simplified architecture with a single runtime model throughout the application
   - Full access to all required Node.js modules and libraries
   - Improved reliability and development efficiency
   - Consistency between development and production environments

This approach prioritizes simplicity, reliability, and development velocity for the current early prototype phase. See Appendix A for future scaling considerations.

---

## 8. Session Management

Authentication tokens and sessions are designed for appropriate persistence and security:

- **Admin login links**: Generated by CLI tool, expire in 1 minute for security
- **Session tokens**: 10-year JWT persistence (stored as cookies) for seamless experience
- **Sign-out functionality**: Available in Settings page for user-controlled session termination
- **JWT implementation**:
  - Cryptographically secure using HMAC-SHA256 with 256-bit app seed
  - Contains user ID as base payload
  - Can include link metadata to projects or file/folder paths within projects
  - Separate token types with different structures and validation rules
  - One-time use login tokens, deleted after validation
  - Enforces strict security headers (httpOnly, secure, sameSite)

The system provides permanent sessions with appropriate security controls for user convenience without compromising security requirements.

---

## 9. Immediate Next Steps

1. **Complete Edge Runtime Elimination**: 
   - Immediately remove all Edge Runtime references from the codebase
   - Migrate all middleware and API routes to Node.js runtime
   - Verify all authentication flows work with Node.js crypto and SQLite
   - Confirm no Edge-specific dependencies remain

2. **Fast metadata access**: Implement LokiJS in-memory database for metadata caching
   - Use LokiJS for efficient document-oriented data storage and querying
   - Create optimized indexes and dynamic views for tree navigation and search
   - Configure proper collection structure with appropriate indexing
   - Implement efficient hydration from Git filesystem on startup
   - Set up binary-serialized persistence for faster startup/recovery
   - Cache project manifests for quick access with efficient querying

3. **Health endpoint enhancement**: Extend existing `/api/health` endpoint
   - Add Git HEAD reference for repository health check
   - Include LokiJS cache metrics (document counts, last update timestamp)
   - Add database connection verification
   - Monitor queue status metrics

4. **Route structure alignment**: Maintain consistent API and page routes

| Type | Route | Purpose | Auth Required |
|------|-------|---------|--------------|
| **Page** | `/` | Landing/Dashboard | No (redirects) |
| **Page** | `/dashboard` | Main application dashboard | Yes |
| **Page** | `/settings` | User settings and configuration | Yes |
| **Page** | `/error` | Unified error handling | No |
| **API** | `/api/health` | System health check | No |
| **API** | `/api/auth/validate` | Validate authentication tokens | No |
| **API** | `/api/auth/signout` | End user session | Yes |
| **API** | `/api/projects` | Create/list projects | Yes |

5. **LokiJS integration**: Properly integrate LokiJS with existing systems
   - Implement cache invalidation through Git hooks
   - Create cache manager module with clear API
   - Set up proper collection structure and indexing
   - Add monitoring and metrics for cache performance

> ⚠️  All other MVP tasks in *mvp.md* remain unchanged; this addendum only tightens the runtime and data‑source strategy while keeping future scale doors open.

---

## Appendix A: Future Scaling Roadmap

When actual usage metrics indicate the need for scaling beyond a single instance, the following approach will be considered:

### CDN-Aware Scaling Approach

1. **Single instance** – Current implementation, perfect for early prototype
2. **CDN sharding** – Deploy regional instances with local filesystem caches:
   - Each CDN edge location gets a dedicated pod with local filesystem
   - Content routing based on geographic proximity
   - Local filesystem access ensures fast operations per region
3. **Local workers** – Task workers run in same pod as local filesystem:
   - Workers operate on their regional filesystem slice
   - Eliminates cross-region file access latency
   - Conversion, thumbnail generation happens close to data
4. **Cross-region replication** – Content synchronized via Git:
   - Central repository with regional clones
   - Push/pull operations handle replication
   - Eventual consistency model with timestamp resolution

### Progressive Technology Transition

1. **Current (In-memory Queue + LokiJS)** – Simple tasks with optimized in-memory cache
2. **BullMQ + ioredis-mock** – Structured queues in single container
3. **Vertical scaling** – Increase CPU/RAM on the single pod
4. **Split workers** – Move BullMQ tasks to separate `doc‑worker` deployment (same PVC)
5. **External Redis** – Add managed Redis; change cache and queue connections
6. **Read replicas** – Stream SQLite WAL to S3; add read-only pods for GET traffic
7. **Postgres migration** – Update schema, keep SQLite for local development
8. **Asset storage** – Move project assets to object storage (R2/S3) as needed

