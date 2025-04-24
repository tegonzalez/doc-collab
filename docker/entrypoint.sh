#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

echo "--- Container Entrypoint ---"
echo "Running as user: $(whoami)"

# Run Git setup as the application user
echo "Running Git setup..."
/usr/local/bin/setup_git.sh

# Check if sudo is available
if ! command -v sudo &> /dev/null; then
    echo "Error: sudo command not found. Ensure it's installed and configured in the Dockerfile."
    exit 1
fi
# Check if sshd is available
if ! command -v /usr/sbin/sshd &> /dev/null; then
    echo "Error: /usr/sbin/sshd not found. Ensure openssh-server is installed."
    exit 1
fi

# Start SSH daemon in the background using sudo
echo "Starting SSH daemon via sudo..."
sudo /usr/sbin/sshd -D -e & # -D: Don't daemonize, -e: Log to stderr
SSHD_PID=$!
echo "SSH daemon initiated (PID $SSHD_PID)."
# Give sshd a moment to start
sleep 2

# Check if sshd is actually running (optional but good practice)
# Use sudo to check process list as non-root user might not see root processes accurately
if ! sudo ps -p $SSHD_PID > /dev/null; then
   echo "Error: Failed to start sshd."
   # Attempt to get logs if possible (might require root/sudo)
   # sudo tail /var/log/messages || echo "Could not read system logs."
   exit 1
fi
echo "SSH daemon appears to be running."


# Handle application command (e.g., "start", "bash")
COMMAND="${1:-start}" # Default to 'start' if no command is provided
shift || true # Remove the first argument (the command) if it exists

# Check the command
if [ "$COMMAND" = "start" ]; then
    echo "Starting Next.js application on port ${PORT:-3000}..."
    exec npm run start -- -p ${PORT:-3000} # Start Next.js in production mode
elif [ "$COMMAND" = "dev" ]; then
     echo "Starting Next.js development server on port ${PORT:-3000}..."
     export NODE_ENV=development
     exec npm run dev -- -p ${PORT:-3000}
elif [ "$COMMAND" = "bash" ]; then
    echo "Starting bash shell..."
    exec /bin/bash "$@"
else
    echo "Executing custom command: $COMMAND $@"
    exec "$COMMAND" "$@"
fi

# Note: 'exec' replaces the current shell process. Code below 'exec' will not run.
