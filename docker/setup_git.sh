#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

# Get configuration from environment or use defaults
APP_USER="${APP_USER:-node}" # Match the USER in Dockerfile
GIT_PROJECT_ROOT="${GIT_PROJECT_ROOT:-/app/projects}"
AUTHORIZED_KEYS_PATH="${AUTHORIZED_KEYS_PATH:-/app/.ssh/authorized_keys}"
SQLITE_DB_PATH="${SQLITE_DB_PATH:-/app/data/collabflow.db}"
SCRIPTS_DIR="/app/scripts" # Directory to store our custom scripts

# Check if running as root; should be run as app user
if [ "$(id -u)" = "0" ]; then
   echo "This script should be run as the application user ($APP_USER), not root." >&2
   exit 1
fi

echo "--- Git Setup & ACL Integration ---"

# --- Ensure Directories Exist --- 
echo "Ensuring Git project root exists: ${GIT_PROJECT_ROOT}"
mkdir -p "${GIT_PROJECT_ROOT}"

echo "Ensuring SSH directory exists: $(dirname "${AUTHORIZED_KEYS_PATH}")"
mkdir -p "$(dirname "${AUTHORIZED_KEYS_PATH}")"
chmod 700 "$(dirname "${AUTHORIZED_KEYS_PATH}")"

echo "Ensuring custom scripts directory exists: ${SCRIPTS_DIR}"
mkdir -p "${SCRIPTS_DIR}"

# --- Copy and Set Permissions for ACL Scripts ---
echo "Setting up ACL scripts..."
cp /app/docker/git-auth-wrapper.sh "${SCRIPTS_DIR}/git-auth-wrapper.sh"
chmod 750 "${SCRIPTS_DIR}/git-auth-wrapper.sh" # Executable by user, readable by group (optional)

cp /app/docker/git-pre-receive-hook.sh "${SCRIPTS_DIR}/git-pre-receive-hook.sh"
chmod 750 "${SCRIPTS_DIR}/git-pre-receive-hook.sh"

# --- Setup Git Repositories (Example: Initialize if needed) ---
# This part might be handled by the application logic later, 
# but we can initialize a default one or ensure hooks are updated in existing ones.
shopt -s nullglob # Prevent errors if no matching dirs
for repo_path in "${GIT_PROJECT_ROOT}"/*.git; do
  if [ -d "$repo_path" ]; then
    echo "Ensuring hooks for existing repository: $repo_path"
    hooks_dir="${repo_path}/hooks"
    # Link or copy the pre-receive hook script
    ln -sf "${SCRIPTS_DIR}/git-pre-receive-hook.sh" "${hooks_dir}/pre-receive"
    echo "  -> pre-receive hook linked."
    
    # You might have a post-receive hook for cache invalidation too.
    # Example: ln -sf "${SCRIPTS_DIR}/git-post-receive-hook.sh" "${hooks_dir}/post-receive"
    # Ensure the hook script exists if you uncomment the above line.
    
    # Make sure hooks are executable (symlinks don't always inherit)
    chmod +x "${hooks_dir}/pre-receive"
    # chmod +x "${hooks_dir}/post-receive"
  fi
done
shopt -u nullglob

# Example: Initialize a default project if it doesn't exist 
# (Consider if this should be app logic instead)
DEFAULT_PROJECT_HASH="defaultproject123abc.git" # Example hash
DEFAULT_PROJECT_DIR="${GIT_PROJECT_ROOT}/${DEFAULT_PROJECT_HASH}"
if [ ! -d "${DEFAULT_PROJECT_DIR}" ]; then
    echo "Initializing default bare Git repository at ${DEFAULT_PROJECT_DIR}..."
    git init --bare "${DEFAULT_PROJECT_DIR}"
    hooks_dir="${DEFAULT_PROJECT_DIR}/hooks"
    # Link hooks for the new repository
    ln -sf "${SCRIPTS_DIR}/git-pre-receive-hook.sh" "${hooks_dir}/pre-receive"
    chmod +x "${hooks_dir}/pre-receive"
    # ln -sf "${SCRIPTS_DIR}/git-post-receive-hook.sh" "${hooks_dir}/post-receive"
    # chmod +x "${hooks_dir}/post-receive"
    echo "Default repository initialized with hooks."
fi

# --- SSH Authorized Keys Setup ---
# The application logic should populate this file based on the database.
# This script just ensures the file exists with correct permissions.
echo "Ensuring authorized_keys file exists and has correct permissions: ${AUTHORIZED_KEYS_PATH}"
touch "${AUTHORIZED_KEYS_PATH}"
chmod 600 "${AUTHORIZED_KEYS_PATH}"

# Ownership should be correct if run as the right user, but double-check if needed.
# chown ${APP_USER}:${APP_USER} "$(dirname "${AUTHORIZED_KEYS_PATH}")" "${AUTHORIZED_KEYS_PATH}" 
# chown -R ${APP_USER}:${APP_USER} "${GIT_PROJECT_ROOT}"
# chown -R ${APP_USER}:${APP_USER} "${SCRIPTS_DIR}"

echo "--- Git Setup & ACL Integration Finished ---"