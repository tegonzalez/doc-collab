# --- Stage 1: Base Image with Dependencies ---
# Use official Node.js image based on Debian Bookworm Slim for better ARM64 support
FROM node:20-bookworm-slim AS base
LABEL maintainer="Your Name <your.email@example.com>"

# Set Debian frontend to noninteractive to avoid prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install essential OS packages using apt-get
# Note: build-essential includes make, g++, etc.
# Node.js and npm are already included in the base image.
RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    build-essential \
    coreutils \
    curl \
    git \
    # libstdc++ is usually part of build-essential/gcc
    # linux-headers might not be needed unless building kernel modules
    openssh-client \
    openssh-server \
    # python3 is often needed for node-gyp
    python3 \
    sqlite3 \
    sudo \
    tzdata \
    # gmp might be needed by pandoc or other libs
    libgmp10 \
    # zlib is usually present, but explicitly adding doesn't hurt
    zlib1g \
    pandoc \
    supervisor \
    # Clean up apt cache
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Restore interactive frontend
ENV DEBIAN_FRONTEND=dialog

# Copy Git setup script and make it executable early
COPY docker/setup_git.sh /usr/local/bin/setup_git.sh
RUN chmod +x /usr/local/bin/setup_git.sh

# PATH should be correctly set by the base node image
# ENV PATH=...

# Set working directory and copy package files
WORKDIR /app
COPY package.json package-lock.json* ./

# --- Stage 2: Build Next.js Application ---
FROM base AS builder
# WORKDIR /app # Inherited
# COPY package.json package-lock.json* ./ # Inherited

# Install/Build application dependencies using npm from the base image
# python3/make/g++ etc are available from build-essential
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Remove development dependencies
RUN npm prune --production

# --- Stage 3: Final Production Image ---
FROM base AS production
WORKDIR /app

# Copy supervisor config
COPY docker/supervisord.conf /etc/supervisor/conf.d/collabflow.conf

# The base image provides user 'node' (UID/GID 1000). We will use this user.
# Ensure data directories exist and set ownership.
# Git setup will be run via supervisor as the 'node' user.
RUN mkdir -p /app/projects /app/data /app/.ssh && \
    chown -R node:node /app/projects /app/data /app/.ssh

# Copy necessary artifacts from builder stage
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/public ./public

# Entrypoint script is no longer needed

# SSH Server Configuration (run as root)
RUN mkdir -p /var/run/sshd && \
    # Configure sshd_config (ensure necessary settings)
    sed -i 's/^#?PermitRootLogin .*/PermitRootLogin no/' /etc/ssh/sshd_config && \
    sed -i 's/^#?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config && \
    sed -i 's/^#?PubkeyAuthentication .*/PubkeyAuthentication yes/' /etc/ssh/sshd_config && \
    # Ensure AuthorizedKeysFile points inside our app user's home
    # Check if line exists before adding
    grep -qxF 'AuthorizedKeysFile /app/.ssh/authorized_keys' /etc/ssh/sshd_config || echo "AuthorizedKeysFile /app/.ssh/authorized_keys" >> /etc/ssh/sshd_config && \
    # Ensure SSH host keys are generated
    ssh-keygen -A

# Environment variables for the production stage
ENV PORT=8080
ENV NODE_ENV=production
ENV GIT_PROJECT_ROOT=/app/projects
ENV SQLITE_DB_PATH=/app/data/collabflow.db
ENV AUTHORIZED_KEYS_PATH=/app/.ssh/authorized_keys

# Expose ports
EXPOSE ${PORT}
EXPOSE 22

# Volume definitions (remain the same)
VOLUME ["/app/projects", "/app/data", "/app/.ssh"]

# Run supervisord as the default command
# USER directive removed, supervisor runs as root
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/supervisord.conf"]
