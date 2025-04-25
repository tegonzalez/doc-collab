#!/bin/bash

# git-pre-receive-hook.sh
# Git pre-receive hook to enforce permissions based on environment variables
# set by git-auth-wrapper.sh.

set -eo pipefail

# Script location (for logging)
SCRIPT_NAME="git-pre-receive-hook.sh"

# --- Logging Function --- 
log_error() {
  echo "$SCRIPT_NAME: Error: $1" >&2
}

log_info() {
  # echo "$SCRIPT_NAME: Info: $1" >&2 # Optional: Enable for debugging
  return 0
}

# --- Get Permission Level --- 
# Read the permission level granted by the wrapper script.
PERMISSION_LEVEL="${GIT_SSH_PERMISSION_LEVEL:-}" # Default to empty
USER_IDS="${GIT_SSH_USER_IDS:-}" # Comma-separated list

log_info "Hook started. Permission Level: '$PERMISSION_LEVEL'. User IDs: '$USER_IDS'"

if [ -z "$PERMISSION_LEVEL" ]; then
  log_error "GIT_SSH_PERMISSION_LEVEL environment variable not set. Denying push."
  exit 1
fi

# --- Permission Mapping --- 
declare -A PERM_ORDER=([R]=1 [RW]=2 [RW+]=3)
USER_PERM_ORDER=${PERM_ORDER[$PERMISSION_LEVEL]:-0}
RW_PLUS_ORDER=${PERM_ORDER[RW+]}

# --- Process Ref Updates --- 
# Read updates from standard input (format: <old-sha> <new-sha> <ref-name>)
changes_processed=0
while read -r oldrev newrev refname; do
  changes_processed=1
  log_info "Processing update: $oldrev $newrev $refname"

  # --- Check for Force Push / Deletes --- 
  # Check if it's a delete (newrev is all zeros)
  if [[ "$newrev" =~ ^0+$ ]]; then
    log_info "Detected delete operation for $refname."
    if [[ "$USER_PERM_ORDER" -lt "$RW_PLUS_ORDER" ]]; then
      log_error "Permission denied: Deleting refs requires 'RW+' permission. User level: '$PERMISSION_LEVEL' for ref '$refname'."
      exit 1
    fi
    # If RW+, allow delete
    continue # Go to next ref update
  fi

  # Check if it's a create (oldrev is all zeros)
  if [[ "$oldrev" =~ ^0+$ ]]; then
    log_info "Detected create operation for $refname."
    # Creating refs is allowed with RW or RW+
    if [[ "$USER_PERM_ORDER" -lt "${PERM_ORDER[RW]}" ]]; then
        log_error "Permission denied: Creating refs requires 'RW' or 'RW+' permission. User level: '$PERMISSION_LEVEL' for ref '$refname'."
        exit 1
    fi
    continue # Go to next ref update
  fi

  # Check for non-fast-forward update (potential force push)
  # Check if oldrev is an ancestor of newrev
  is_ff=$(git merge-base --is-ancestor "$oldrev" "$newrev" && echo 1 || echo 0)

  if [[ "$is_ff" -eq 0 ]]; then
    log_info "Detected non-fast-forward update for $refname (potential force push)."
    if [[ "$USER_PERM_ORDER" -lt "$RW_PLUS_ORDER" ]]; then
      log_error "Permission denied: Non-fast-forward push (force push) requires 'RW+' permission. User level: '$PERMISSION_LEVEL' for ref '$refname'."
      exit 1
    fi
    # If RW+, allow non-fast-forward
    log_info "RW+ permission granted for non-fast-forward push on $refname."
  else
     log_info "Update is fast-forward for $refname."
  fi

  # --- Add Other Checks Here --- 
  # e.g., Enforce branch naming conventions
  # if [[ "$refname" == refs/heads/master ]] && [[ "$PERMISSION_LEVEL" != "RW+" ]]; then
  #   log_error "Pushing directly to master requires 'RW+' permission."
  #   exit 1
  # fi

  # e.g., Check commit message format (more complex, involves examining commits)

done

if [[ $changes_processed -eq 0 ]]; then
    log_info "No ref updates received on stdin."
fi

# If we reached here, all checks passed for all refs
log_info "All checks passed. Allowing push."
exit 0
