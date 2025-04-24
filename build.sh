#!/bin/bash

# build.sh - Helper script to build and run the CollabFlow Docker container

set -e # Exit immediately if a command exits with a non-zero status.

# Use the default 'node' user (UID/GID 1000) from the base image.

echo "Building Docker image..."
docker-compose build "$@" # Pass any script arguments (e.g., --no-cache) to build

echo ""
echo "Starting container..."
docker-compose up -d

echo ""
echo "-------------------------------------"
echo "CollabFlow Container Started (via Supervisord)"
echo "-------------------------------------"
echo "Access:"
echo "  Web UI: http://localhost:${HOST_PORT:-8080}"
echo "  Git SSH: ssh://node@localhost:2222/<project-name>.git"
echo "     (Manage keys in volume collabflow_ssh_keys)"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down"
echo "-------------------------------------"

# Explicitly exit cleanly
exit 0 