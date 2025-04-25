#!/bin/bash

# git-auth-wrapper.sh
# Gatekeeper script for SSH Git access, called by sshd command directive.

set -eo pipefail # Exit on error, treat unset variables as error, pipe failures

# --- Configuration --- 
# Values should match those used in the application/Dockerfile setup.
# Ideally, read from environment variables set by the container.
SQLITE_DB_PATH="${SQLITE_DB_PATH:-/app/data/collabflow.db}"
GIT_PROJECT_ROOT="${GIT_PROJECT_ROOT:-/app/projects}"
GIT_CMD_PATH="${GIT_CMD_PATH:-/usr/bin/git}"

# Script location (for logging)
SCRIPT_NAME="git-auth-wrapper.sh"

# --- Logging Function --- 
log_error() {
  echo "$SCRIPT_NAME: Error: $1" >&2
}

log_info() {
  # echo "$SCRIPT_NAME: Info: $1" >&2 # Optional: Enable for debugging
  return 0
}

# --- Input Validation --- 
if [ -z "$1" ]; then
  log_error "Missing key_id argument."
  exit 1
fi
KEY_ID="$1"

# Validate KEY_ID is a number
if ! [[ "$KEY_ID" =~ ^[0-9]+$ ]]; then
    log_error "Invalid key_id format: $KEY_ID"
    exit 1
fi

log_info "Processing request for key_id: $KEY_ID"

# --- Database Query Function --- 
# Safely queries the SQLite database.
# Usage: db_query <variable_name> <sql_query>
# Note: Uses simple variable substitution. Assumes KEY_ID and safe project_name are used.
# Consider more robust quoting/escaping if complex inputs were possible.
db_query() {
  local __resultvar=$1
  local query=$2
  local result

  if ! result=$(sqlite3 "$SQLITE_DB_PATH" "$query" 2>&1); then
    log_error "Database query failed: $result"
    log_error "Query: $query"
    return 1 # Indicate failure
  fi

  # Assign result to the variable name passed as first argument
  eval $__resultvar='$result'
  return 0 # Indicate success
}

# --- Identify Associated User IDs --- 
QUERY_USER_IDS="SELECT user_id FROM user_ssh_keys WHERE key_id = ${KEY_ID};"
if ! db_query USER_IDS "$QUERY_USER_IDS"; then
  exit 1
fi

if [ -z "$USER_IDS" ]; then
  log_error "No users associated with this key (key_id: ${KEY_ID})."
  exit 1
fi

# Convert newline-separated list to comma-separated for SQL IN clause
USER_ID_LIST=$(echo "$USER_IDS" | paste -sd,)
log_info "Associated user_ids: $USER_ID_LIST"

# --- Determine Action Based on Original Command --- 
ORIGINAL_COMMAND="${SSH_ORIGINAL_COMMAND:-}" # Default to empty if not set
log_info "Original command: '$ORIGINAL_COMMAND'"

case "$ORIGINAL_COMMAND" in
  "" | "list-repositories") # Handle empty command or explicit list request
    # --- List Repositories --- 
    log_info "Action: List repositories"
    
    # Query permissions for all associated users
    QUERY_PERMS="SELECT project_name, permission_level FROM ssh_permissions WHERE user_id IN (${USER_ID_LIST});"
    if ! db_query PERMISSIONS "$QUERY_PERMS"; then
      exit 1
    fi

    # Aggregate permissions: Find the highest permission per project
    declare -A AGGREGATED_PERMS
    declare -A PERM_ORDER=([R]=1 [RW]=2 [RW+]=3)
    OLD_IFS="$IFS"
    IFS=$'
'
    for line in $PERMISSIONS; do
      # Skip empty lines if any
      [[ -z "$line" ]] && continue
      
      IFS='|' read -r project_name perm_level <<< "$line"
      # Trim potential whitespace
      project_name=$(echo "$project_name" | xargs)
      perm_level=$(echo "$perm_level" | xargs)

      current_max_perm=${AGGREGATED_PERMS[$project_name]}
      current_max_order=${PERM_ORDER[$current_max_perm]:-0}
      new_order=${PERM_ORDER[$perm_level]:-0}

      if [[ "$new_order" -gt "$current_max_order" ]]; then
        AGGREGATED_PERMS["$project_name"]=$perm_level
        log_info "Aggregated perm for '$project_name': $perm_level"
      fi
    done
    IFS="$OLD_IFS"

    # List actual directories in GIT_PROJECT_ROOT and print permissions
    log_info "Checking filesystem path: $GIT_PROJECT_ROOT"
    shopt -s nullglob # Prevent errors if no matching dirs
    found_repos=0
    for repo_path in "$GIT_PROJECT_ROOT"/*.git; do
      if [[ -d "$repo_path" ]]; then # Ensure it's a directory
          repo_name=$(basename "$repo_path")
          if [[ -v AGGREGATED_PERMS["$repo_name"] ]]; then
              perm=${AGGREGATED_PERMS[$repo_name]}
              # Format output like gitolite (perm level, space, repo name without .git)
              printf "%-3s %s
" "$perm" "${repo_name%.git}"
              found_repos=1
          else
              log_info "No permissions found for existing repo: $repo_name"
          fi
      fi
    done
    shopt -u nullglob
    
    if [[ $found_repos -eq 0 ]]; then
        log_info "No accessible repositories found."
        # Optionally print a message to the user?
        # echo "No accessible repositories found." >&2 
    fi
    exit 0
    ;;

  git-upload-pack*|git-receive-pack*)
    # --- Handle Git Operations --- 
    GIT_COMMAND_TYPE=$(echo "$ORIGINAL_COMMAND" | cut -d' ' -f1) # git-upload-pack or git-receive-pack
    log_info "Action: $GIT_COMMAND_TYPE"

    # Extract repository name (e.g., 'projecthash.git') - Needs careful validation!
    # This regex attempts to securely extract the path within single quotes.
    if ! [[ "$ORIGINAL_COMMAND" =~ ^(git-upload-pack|git-receive-pack)[[:space:]]+''([^'[:space:]/][^'/]*)'$ ]]; then
        log_error "Could not parse repository path from command: $ORIGINAL_COMMAND"
        exit 1
    fi
    REQUESTED_REPO_REL_PATH="${BASH_REMATCH[2]}"
    
    # Further validation: Ensure it ends with .git and contains only expected characters (hash-like)
    if [[ ! "$REQUESTED_REPO_REL_PATH" =~ ^[a-f0-9]+\.git$ ]]; then
        log_error "Invalid repository name format: '$REQUESTED_REPO_REL_PATH'"
        exit 1
    fi
    
    REQUESTED_REPO_BASENAME=$(basename "$REQUESTED_REPO_REL_PATH")
    log_info "Requested repo: $REQUESTED_REPO_BASENAME"

    # Check if repository exists on filesystem
    FULL_REPO_PATH="$GIT_PROJECT_ROOT/$REQUESTED_REPO_BASENAME"
    if [ ! -d "$FULL_REPO_PATH" ]; then
        log_error "Repository directory '$FULL_REPO_PATH' not found."
        exit 1
    fi

    # Check permissions for this specific repo
    QUERY_REPO_PERMS="SELECT permission_level FROM ssh_permissions WHERE user_id IN (${USER_ID_LIST}) AND project_name = '${REQUESTED_REPO_BASENAME}';"
    if ! db_query REPO_PERMISSIONS "$QUERY_REPO_PERMS"; then
      exit 1
    fi

    # Determine highest permission level for this repo
    declare -A PERM_ORDER=([R]=1 [RW]=2 [RW+]=3)
    MAX_PERM_LEVEL=""
    MAX_PERM_ORDER=0
    OLD_IFS="$IFS"
    IFS=$'
'
    for perm_level in $REPO_PERMISSIONS; do
        [[ -z "$perm_level" ]] && continue # Skip empty lines
        perm_level=$(echo "$perm_level" | xargs) # Trim whitespace
        new_order=${PERM_ORDER[$perm_level]:-0}
        if [[ "$new_order" -gt "$MAX_PERM_ORDER" ]]; then
            MAX_PERM_LEVEL=$perm_level
            MAX_PERM_ORDER=$new_order
        fi
    done
    IFS="$OLD_IFS"

    log_info "Max permission for '$REQUESTED_REPO_BASENAME': $MAX_PERM_LEVEL (Order: $MAX_PERM_ORDER)"

    ACCESS_GRANTED=0
    REQUIRED_PERM_ORDER=0

    if [[ "$GIT_COMMAND_TYPE" == "git-upload-pack" ]]; then # Read access
        REQUIRED_PERM_ORDER=${PERM_ORDER[R]}
        if [[ "$MAX_PERM_ORDER" -ge "$REQUIRED_PERM_ORDER" ]]; then
            ACCESS_GRANTED=1
        fi
    elif [[ "$GIT_COMMAND_TYPE" == "git-receive-pack" ]]; then # Write access
        REQUIRED_PERM_ORDER=${PERM_ORDER[RW]}
        if [[ "$MAX_PERM_ORDER" -ge "$REQUIRED_PERM_ORDER" ]]; then
            ACCESS_GRANTED=1
        fi
    fi

    # Execute or Deny
    if [[ "$ACCESS_GRANTED" -eq 1 ]]; then
        log_info "Access granted for $GIT_COMMAND_TYPE on '$REQUESTED_REPO_BASENAME' with level $MAX_PERM_LEVEL"
        
        # Set environment variables for hooks
        export GIT_SSH_PERMISSION_LEVEL="$MAX_PERM_LEVEL"
        # Get the specific user IDs that have *any* permission for this repo
        QUERY_GRANTING_USERS="SELECT user_id FROM ssh_permissions WHERE user_id IN (${USER_ID_LIST}) AND project_name = '${REQUESTED_REPO_BASENAME}';"
        if db_query GRANTING_USER_IDS "$QUERY_GRANTING_USERS"; then
             export GIT_SSH_USER_IDS=$(echo "$GRANTING_USER_IDS" | paste -sd,) # Comma separated list
             log_info "Granting user IDs for hooks: $GIT_SSH_USER_IDS"
        else
             log_info "Could not retrieve granting user IDs for hooks."
             export GIT_SSH_USER_IDS=""
        fi

        # Construct the git command path (e.g., /usr/bin/git-upload-pack)
        GIT_EXEC_COMMAND="$GIT_CMD_PATH-${GIT_COMMAND_TYPE#git-}" # Replaces 'git-' prefix
        
        # Use exec to replace this script with the git command
        exec "$GIT_EXEC_COMMAND" "$FULL_REPO_PATH"
    else
        log_error "Permission denied for ${GIT_COMMAND_TYPE#git-} on repository '$REQUESTED_REPO_BASENAME'. Required level >= $REQUIRED_PERM_ORDER, Max found: $MAX_PERM_ORDER ($MAX_PERM_LEVEL)"
        exit 1
    fi
    ;;

  *)
    # --- Deny Other Commands ---
    log_error "Command not allowed via SSH: '$ORIGINAL_COMMAND'"
    exit 1
    ;;
esac
