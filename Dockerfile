# --- Stage 1: Base Image with Dependencies ---
FROM alpine:3.19 AS base
LABEL maintainer="Your Name <your.email@example.com>"

# Install essential packages: sudo (for user creation/sshd), bash, coreutils, curl, openssh (for git server), git, sqlite, pandoc
# Pandoc on Alpine needs specific dependencies from testing repo sometimes
# Install Node.js via node version manager (nvm) for better version control
ENV NODE_VERSION=20.12.2
ENV NVM_DIR=/usr/local/nvm

RUN apk update && \
    apk add --no-cache \
        bash \
        build-base \
        coreutils \
        curl \
        git \
        libstdc++ \
        linux-headers \
        openssh \
        python3 \
        sqlite \
        sudo \
        tzdata \
        # Pandoc dependencies (might need adjustment based on specific pandoc features used)
        gmp \
        zlib \
        # Pandoc itself
        pandoc \
        && \
    # Install NVM and Node.js
    mkdir -p $NVM_DIR && \
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash && \
    . $NVM_DIR/nvm.sh && \
    nvm install $NODE_VERSION && \
    nvm alias default $NODE_VERSION && \
    nvm use default && \
    # Link node and npm to /usr/local/bin
    ln -s $NVM_DIR/versions/node/v$NODE_VERSION/bin/node /usr/local/bin/node && \
    ln -s $NVM_DIR/versions/node/v$NODE_VERSION/bin/npm /usr/local/bin/npm && \
    ln -s $NVM_DIR/versions/node/v$NODE_VERSION/bin/npx /usr/local/bin/npx && \
    # Clean up apk cache
    rm -rf /var/cache/apk/*

# Set Node.js environment variables
ENV NODE_PATH $NVM_DIR/versions/node/v$NODE_VERSION/lib/node_modules
ENV PATH      $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

# --- Stage 2: Build Next.js Application ---
FROM base AS builder
WORKDIR /app

# Copy package.json and lock file first for dependency caching
COPY package.json package-lock.json* ./

# Install dependencies (using npm ci for faster, reproducible builds)
# Ensure Python3 is available for node-gyp if needed by dependencies
RUN apk add --no-cache --virtual .gyp python3 make g++ && \
    npm ci && \
    apk del .gyp

# Copy the rest of the application code
COPY . .

# Build the Next.js application
# Set NEXT_TELEMETRY_DISABLED to avoid telemetry during build
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Remove development dependencies
RUN npm prune --production

# --- Stage 3: Final Production Image ---
FROM base AS production
WORKDIR /app

# Create a non-root user for security
ARG APP_USER=collabflow
ARG APP_UID=1001
ARG APP_GID=1001
RUN addgroup -g ${APP_GID} ${APP_USER} && \
    adduser -u ${APP_UID} -G ${APP_USER} -h /app -s /bin/bash -D ${APP_USER} && \
    # Grant sudo permission *only* for starting sshd
    echo "${APP_USER} ALL=(ALL) NOPASSWD: /usr/sbin/sshd" >> /etc/sudoers && \
    # Ensure sudoers file has correct permissions
    chmod 0440 /etc/sudoers && \
    # Ensure /app directory exists and is owned by the app user
    mkdir -p /app /app/projects /app/data /app/.ssh && \
    chown -R ${APP_USER}:${APP_USER} /app

# Copy built application from builder stage
COPY --from=builder --chown=${APP_USER}:${APP_USER} /app/.next ./.next
COPY --from=builder --chown=${APP_USER}:${APP_USER} /app/node_modules ./node_modules
COPY --from=builder --chown=${APP_USER}:${APP_USER} /app/package.json ./package.json
COPY --from=builder --chown=${APP_USER}:${APP_USER} /app/public ./public # Copy public assets

# Copy entrypoint script and Git setup script
COPY --chown=${APP_USER}:${APP_USER} docker/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY --chown=${APP_USER}:${APP_USER} docker/setup_git.sh /usr/local/bin/setup_git.sh
RUN chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/setup_git.sh

# SSH Server Configuration (as root before switching user)
RUN mkdir -p /var/run/sshd && \
    # Configure sshd_config (consider security hardening)
    sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin no/' /etc/ssh/sshd_config && \
    sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config && \
    sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config && \
    # Ensure AuthorizedKeysFile points inside our app user's home relative to homedir (/app) -> /app/.ssh/authorized_keys
    # Correct path should be absolute or relative to user's home
    echo "AuthorizedKeysFile /app/.ssh/authorized_keys" >> /etc/ssh/sshd_config && 
    # Ensure SSH host keys are generated if they don't exist
    ssh-keygen -A

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV GIT_PROJECT_ROOT=/app/projects
ENV SQLITE_DB_PATH=/app/data/collabflow.db
ENV AUTHORIZED_KEYS_PATH=/app/.ssh/authorized_keys
# Add any other runtime environment variables needed by your app

# Expose ports
EXPOSE ${PORT} # Next.js app
EXPOSE 22     # SSH for Git

# Set the user *after* all root operations are done
USER ${APP_USER}

# Persist data volumes
VOLUME ["/app/projects", "/app/data", "/app/.ssh"]

# Set the entrypoint script
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

# Default command (starts Next.js app)
CMD ["start"]
