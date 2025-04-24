# CollabFlow - Document Collaboration Platform

Minimalist, self-hosted document workflow and collaboration platform built with Next.js, Git, and Pandoc.

## Prerequisites

Ensure the following are installed on your system:

*   **Node.js:** v20.x or later (recommend using nvm)
*   **npm:** v10.x or later (usually included with Node.js)
*   **Git:** v2.x or later
*   **Pandoc:** v2.x or later (required for document conversion)
*   **SQLite3:** CLI and development libraries (for database interaction)
*   **(Optional) Docker:** For containerized deployment
*   **(Optional) kubectl:** For Kubernetes deployment

## Setup & Installation

### 1. Containerized (Docker / Kubernetes)

This is the recommended method for deployment.

**Prerequisites:** Docker installed.

**Build:**

```bash
# Using Docker Compose (recommended for local testing)
docker-compose build

# Or using Docker directly
docker build -t collabflow-app:latest .
```

**Run (Docker Compose):**

```bash
# Start in detached mode
docker-compose up -d

# Access:
# - Web UI: http://localhost:3000
# - Git SSH: ssh://<USER>@localhost:2222/app/projects/main-project.git
#   (Replace <USER> with container user, default 'collabflow'. Manage keys in volume 'collabflow_ssh_keys')
```

**Run (Docker):**

```bash
docker run -d --name collabflow_app \
  -p 3000:3000 \
  -p 2222:22 \
  -v collabflow_projects:/app/projects \
  -v collabflow_data:/app/data \
  -v collabflow_ssh_keys:/app/.ssh \
  -e NODE_ENV=production \
  collabflow-app:latest
```

**(TODO) Kubernetes:**

*   Manifest files for Deployment, Service, PersistentVolumeClaims, and potentially Ingress are needed.
*   Secrets management for any sensitive configuration.
*   Health checks (`/api/health` endpoint TBD).

### 2. Non-Containerized (Direct Host)

**Prerequisites:** Node.js, npm, Git, Pandoc, SQLite3 installed directly on the host.

**Installation:**

```bash
# Clone the repository
git clone <repository_url>
cd collabflow

# Install dependencies
npm ci
```

**Configuration:**

1.  **Environment Variables:** Create a `.env.local` file (or set environment variables directly) based on `.env.example` (TBD - need to create this). Key variables include:
    *   `PORT`: (e.g., 3000)
    *   `GIT_PROJECT_ROOT`: Path to store Git repositories (e.g., `./data/projects`)
    *   `SQLITE_DB_PATH`: Path for the SQLite database file (e.g., `./data/collabflow.db`)
    *   `AUTHORIZED_KEYS_PATH`: Path to the `authorized_keys` file for SSH access (e.g., `./data/ssh/authorized_keys`)
    *   `NODE_ENV`: Set to `production` for deployment.
2.  **Git Setup:** Manually initialize the bare Git repository and configure hooks:
    ```bash
    mkdir -p $GIT_PROJECT_ROOT
    git init --bare $GIT_PROJECT_ROOT/main-project.git
    # Configure hooks similar to docker/setup_git.sh
    # Set up SSH access (e.g., configure system sshd or use git-shell)
    ```
3.  **SSH Server:** Configure the system's SSH server (`sshd`) to allow access for the user running the application, pointing `AuthorizedKeysFile` to the path specified in `AUTHORIZED_KEYS_PATH`. Ensure password authentication is disabled.

**Build:**

```bash
npm run build
```

**Run:**

```bash
npm run start
```

The application will run, serving the web UI on the configured `PORT` and relying on the system's `sshd` for Git access. Ensure the user running the Node.js process has correct permissions for Git repositories, SQLite DB, and SSH keys.

## Development

```bash
# Install dependencies
npm install

# Run development server (with hot-reloading)
npm run dev

# Access: http://localhost:3000 (or configured port)
```
