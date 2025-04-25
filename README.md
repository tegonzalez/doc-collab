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

**Container Configuration:**

*   **Node.js:** The container uses Node.js v20.x included in the official `node:20-bookworm-slim` base image.
*   **User:** The container runs as the standard non-root user `node` (UID/GID 1000) provided by the base image.
*   **Permissions:** The container runs with fixed UID/GID 1000. If you encounter permission issues with host-mounted volumes, you may need to adjust permissions on the host manually.
*   **Port:** The host port mapping and internal container port default to 8080. These can be configured by creating a `.env` file in the project root and setting the `HOST_PORT` and `PORT` variables (e.g., `HOST_PORT=8080`, `PORT=8080`).
*   **Process Management:** The container uses `supervisord` to manage the `sshd` (running as root) and the Node.js application (running as user `node`).

**Build:**

```bash
# Using Docker Compose (recommended for local testing/deployment)
docker-compose build

# Or using Docker directly
docker build -t collabflow-app:latest .
```

**Run (Docker Compose):**

```bash
# Start in detached mode (uses HOST_PORT and PORT from .env)
docker-compose up -d

# Access:
# - Web UI: http://localhost:8080 # Or your configured HOST_PORT
# - Git SSH: ssh://node@localhost:2222/<project-name>.git 
#   (Username is 'node'. Manage keys in volume 'collabflow_ssh_keys')
```

**Run (Docker):**

```bash
# Container runs as user 'node' (UID/GID 1000)
docker run -d --name collabflow_app \
  -p <HOST_PORT>:8080 \
  -p 2222:22 \
  -v collabflow_projects:/app/projects \
  -v collabflow_data:/app/data \
  -v collabflow_ssh_keys:/app/.ssh \
  # Pass internal PORT environment variable if overriding the default 8080
  -e PORT=8080 \
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

### 3. VS Code Dev Container (Recommended for Development)

This method provides a consistent, containerized development environment using the same Docker setup.

**Prerequisites:**
*   Docker (or compatible, e.g., OrbStack) installed and running.
*   Visual Studio Code installed.
*   VS Code "Dev Containers" extension installed (ID: `ms-vscode-remote.remote-containers`).

**Setup:**

1.  Clone the repository:
    ```bash
    git clone <repository_url>
    cd collabflow
    ```
2.  Open the cloned `collabflow` folder in VS Code.
3.  VS Code should automatically detect the `.devcontainer/devcontainer.json` file and prompt you to "Reopen in Container". Click this button.
    *   If the prompt doesn't appear, open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`), search for "Dev Containers: Reopen in Container", and select it.
4.  VS Code will build the Docker image (if not already built) and start the necessary containers defined in the `docker-compose.yml` and `.devcontainer/docker-compose.dev.yml` files. This might take a few minutes on the first run.
5.  Once the container is ready, VS Code will connect to it. Your workspace files will be mounted inside the container at `/app`, and any configured extensions will be installed.

**Running the Development Server:**

*   Open the integrated terminal in VS Code (`Ctrl+` ` or `Cmd+ `` `). This terminal is running *inside* the dev container.
*   Run the development server:
    ```bash
    npm run dev
    ```
*   Access the running application in your browser: `http://localhost:8080` (or your configured HOST_PORT, automatically forwarded).
*   Git SSH access for the container is available on `localhost:2222` (connect as user `node`).

## Development

The recommended way to develop this project is using the **VS Code Dev Container** setup described above. It ensures a consistent environment matching the deployment setup and handles dependencies automatically. The container runs as the standard `node` user.

If you prefer not to use the Dev Container:

```bash
# Install dependencies (on your host machine)
npm install

# Create a .env.local file and set PORT=8080 (or your desired port)
# If needed for host development

# Run development server (with hot-reloading)
npm run dev

# Access: http://localhost:8080 (or configured port)
```

### Running the Application

1.  **Build the container:**
    ```bash
    docker-compose build
    ```
2.  **Run the container:**
    ```bash
    docker-compose up -d
    ```
    *   The application will be available at `http://localhost:3000`.
    *   The Git SSH server will be available at `ssh://<user>@localhost:2222/app/projects/main-project.git` (or other project names).
    *   Mapped volumes ensure data persistence:
        *   `./projects_data:/app/projects` (Git repositories)
        *   `./db_data:/app/data` (SQLite database)
        *   `./ssh_keys:/app/.ssh` (User SSH keys for Git access - place public keys in `authorized_keys` here)

3.  **Initial Admin Setup:**
    *   To log in as the initial admin user, you need to generate a one-time authentication link.
    *   Run the following command in your terminal (while the container is running or if running non-containerized):
        ```bash
        npm run gen-admin-link
        ```
    *   This script will:
        *   Ensure the admin user (ID 1) exists in the database.
        *   Generate a unique, single-use authentication token.
        *   Print a URL to the console (e.g., `http://localhost:3000/api/auth/validate?token=...`).
    *   **Copy the generated URL and paste it into your browser.** This will authenticate you as the admin and redirect you to the dashboard.
    *   The link expires after 60 minutes.

### Non-Containerized Setup (Alternative)

If you prefer not to use Docker:

1.  **Prerequisites:** Node.js (v20+), Git, SQLite3, Pandoc, OpenSSH.
2.  **Install dependencies:**
    ```bash
    # Clone the repository
    git clone <repository_url>
    cd collabflow

    # Install dependencies
    npm ci
    ```
