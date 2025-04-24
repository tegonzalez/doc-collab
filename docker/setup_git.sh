#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

PROJECT_ROOT="${GIT_PROJECT_ROOT:-/app/projects}"
DEFAULT_PROJECT_NAME="main-project" # Or derive from env var if needed
PROJECT_DIR="${PROJECT_ROOT}/${DEFAULT_PROJECT_NAME}.git" # Bare repository name

# Check if running as root; should be run as app user
if [ "$(id -u)" = "0" ]; then
   echo "This script should be run as the application user, not root."
   exit 1
fi

echo "--- Git Setup ---"
echo "Ensuring Git project root exists: ${PROJECT_ROOT}"
mkdir -p "${PROJECT_ROOT}"
# chown ${APP_USER}:${APP_USER} "${PROJECT_ROOT}" # Should already be owned by user

# Check if the bare repository already exists
if [ ! -d "${PROJECT_DIR}" ]; then
    echo "Initializing bare Git repository at ${PROJECT_DIR}..."
    git init --bare "${PROJECT_DIR}"
    echo "Git repository initialized."

    # --- Git Hooks Setup ---
    HOOKS_DIR="${PROJECT_DIR}/hooks"
    echo "Setting up Git hooks in ${HOOKS_DIR}..."

    # Pre-receive Hook (Example: Enforce rebase-only/single-ancestor - VERY basic example)
    # A more robust implementation would involve checking the pushed commits against the existing history.
    cat << 'EOF' > "${HOOKS_DIR}/pre-receive"
#!/bin/bash
echo "Running pre-receive hook..."
# Placeholder for merge commit check (this is a simplified check)
# A real check would iterate through new refs and check commit ancestry/merge flags.
# zero_commit="0000000000000000000000000000000000000000"
# while read oldrev newrev refname; do
#     # Check if it's a merge commit being pushed (simplistic check)
#     # is_merge=$(git rev-list --merges -n 1 "$newrev" "^$oldrev")
#     # if [ -n "$is_merge" ]; then
#     #    echo "*** Error: Merge commits are not allowed. Please rebase your changes."
#     #    exit 1
#     # fi
#     echo "Processing ref: $refname ($oldrev -> $newrev)" >> /app/data/git_hook.log # Log for debugging
# done
echo "Pre-receive hook finished." >> /app/data/git_hook.log
exit 0 # Allow push for now
EOF
    chmod +x "${HOOKS_DIR}/pre-receive"
    echo "pre-receive hook created."

    # Post-receive Hook (Trigger cache invalidation/other actions)
    cat << 'EOF' > "${HOOKS_DIR}/post-receive"
#!/bin/bash
echo "Running post-receive hook..."
# Read standard input to get refs information
while read oldrev newrev refname; do
  echo "Ref $refname updated: $oldrev -> $newrev" >> /app/data/git_hook.log # Log for debugging
  # Here you would trigger your application logic to:
  # 1. Identify changed files/folders between oldrev and newrev
  # 2. Invalidate the relevant parts of the in-memory cache
  # 3. Potentially trigger artifact regeneration
  echo "Triggering application update for $refname..." >> /app/data/git_hook.log
  # Example: curl -X POST http://localhost:3000/api/internal/git-update -H "Content-Type: application/json" -d "{"ref": "$refname", "oldrev": "$oldrev", "newrev": "$newrev"}"
done
echo "Post-receive hook finished." >> /app/data/git_hook.log
exit 0
EOF
    chmod +x "${HOOKS_DIR}/post-receive"
    echo "post-receive hook created."

    echo "Git hooks setup complete."
else
    echo "Git repository at ${PROJECT_DIR} already exists. Skipping initialization."
    # Ensure hooks are still executable if they exist
    [ -f "${HOOKS_DIR}/pre-receive" ] && chmod +x "${HOOKS_DIR}/pre-receive"
    [ -f "${HOOKS_DIR}/post-receive" ] && chmod +x "${HOOKS_DIR}/post-receive"
fi

# --- SSH Authorized Keys Setup ---
AUTHORIZED_KEYS="${AUTHORIZED_KEYS_PATH:-/app/.ssh/authorized_keys}"
echo "Ensuring authorized_keys file exists: ${AUTHORIZED_KEYS}"
mkdir -p "$(dirname "${AUTHORIZED_KEYS}")"
touch "${AUTHORIZED_KEYS}"
chmod 600 "${AUTHORIZED_KEYS}"
chmod 700 "$(dirname "${AUTHORIZED_KEYS}")"
# chown ${APP_USER}:${APP_USER} "$(dirname "${AUTHORIZED_KEYS}")" "${AUTHORIZED_KEYS}" # Should be owned by user

echo "--- Git Setup Finished ---"
