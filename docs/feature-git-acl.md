# Git SSH Access Control List (ACL) Strategy

This document outlines the mechanism for controlling Git access (clone, pull, push) via SSH, providing project-level permissions distinct from the web UI's potentially finer-grained (folder-level) access.

## Core Concepts

1.  **Single System User:** All SSH Git operations occur under a single, non-privileged system user (e.g., `node` or `collabflow`) within the container.
2.  **SSH Key Authentication:** Users authenticate using SSH public keys.
3.  **Database Mapping:**
    *   Public keys are stored in the `ssh_keys` table.
    *   A many-to-many relationship exists between users and keys via the `user_ssh_keys` table. A single key can be associated with multiple user accounts.
    *   Permissions are defined in the `ssh_permissions` table, linking `user_id` to `project_name` (the repository directory name, e.g., `hash123abc.git`) with a permission level (`R`, `RW`, `RW+`).
4.  **Filesystem Authority:** The existence of Git repositories is determined by directories ending in `.git` within the designated `$GIT_PROJECT_ROOT` directory on the filesystem. The database does not store a definitive list of projects for this mechanism.
5.  **`authorized_keys` Control:** The `~/.ssh/authorized_keys` file for the system user does not grant direct shell access. Instead, each key entry uses the `command="..."` directive to force the execution of a wrapper script (`git-auth-wrapper.sh`), passing the database `key_id` of the authenticating key.
6.  **Wrapper Script Logic:** The `git-auth-wrapper.sh` script acts as the primary gatekeeper:
    *   Identifies all `user_id`s associated with the incoming `key_id`.
    *   If no command is provided (`ssh git@host`), it queries the `ssh_permissions` for all associated users, aggregates the highest permission level per project, checks against existing directories in `$GIT_PROJECT_ROOT`, and lists the accessible repositories with their highest permission level (`R`/`RW`/`RW+`).
    *   If a `git-upload-pack` (read) or `git-receive-pack` (write) command is attempted:
        *   It parses the target repository name.
        *   Verifies the repository directory exists on the filesystem.
        *   Queries `ssh_permissions` for all associated users for that specific project.
        *   Determines the highest aggregate permission level for that project.
        *   Authorizes `git-upload-pack` if the level is `R`, `RW`, or `RW+`.
        *   Authorizes `git-receive-pack` if the level is `RW` or `RW+`.
        *   If authorized, it sets environment variables (`GIT_SSH_PERMISSION_LEVEL`, `GIT_SSH_USER_IDS`) for potential use in Git hooks and executes the original Git command (`git-upload-pack` or `git-receive-pack`).
        *   If denied, it exits with an error.
    *   All other commands are denied.
7.  **Git Hooks (`pre-receive`):** After the wrapper script grants initial write access (`git-receive-pack`), the `pre-receive` hook within the repository enforces finer-grained rules:
    *   Reads the `GIT_SSH_PERMISSION_LEVEL` environment variable.
    *   Checks for operations requiring higher privileges (e.g., non-fast-forward pushes like force push or branch deletion).
    *   Rejects the push if the user's aggregate permission level is not sufficient (e.g., requires `RW+` for force push).
    *   Can also enforce other policies like commit message formats or branch naming conventions.

## Database Schema Snippet

```sql
-- Stores unique public keys provided by users
CREATE TABLE ssh_keys (
    key_id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_key TEXT NOT NULL UNIQUE,
    description TEXT
);

-- Many-to-many relationship between users and ssh keys
CREATE TABLE user_ssh_keys (
    user_id INTEGER NOT NULL,
    key_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, key_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (key_id) REFERENCES ssh_keys(key_id) ON DELETE CASCADE
);

-- Defines SSH access rights per user, per project repository name
CREATE TABLE ssh_permissions (
    permission_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    project_name TEXT NOT NULL, -- e.g., 'projecthash123.git'
    permission_level TEXT NOT NULL CHECK(permission_level IN ('R', 'RW', 'RW+')),
    UNIQUE (user_id, project_name),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
```

## `authorized_keys` Example Entry

```
command="/app/scripts/git-auth-wrapper.sh 123",no-port-forwarding,no-X11-forwarding,no-agent-forwarding,no-pty ssh-rsa AAAAB3NzaC1yc2E... key-description-from-db
```
(Where `123` is the `key_id` from the `ssh_keys` table)

## Security Considerations

*   The `git-auth-wrapper.sh` script must rigorously validate the repository name extracted from `SSH_ORIGINAL_COMMAND` to prevent path traversal or command injection vulnerabilities.
*   Database queries within the script must be secure, ideally using prepared statements if a more complex language were used, or careful quoting/validation with the `sqlite3` CLI.
*   The system user running `sshd` and the Git commands should have minimal privileges.
*   File permissions for scripts, repositories, and the database must be appropriately restricted.
