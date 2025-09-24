FROM node:18-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory and user for security
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy package files and install ALL dependencies (including dev for building)
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Copy source code
COPY --chown=nodejs:nodejs src/ ./src/
COPY --chown=nodejs:nodejs tsconfig.json ./

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Create necessary directories
RUN mkdir -p /app/certs && chown nodejs:nodejs /app/certs

# Switch to non-root user
USER nodejs

# Expose SMTP ports
EXPOSE 25 587 2525

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const net = require('net'); const port = process.env.SMTP_PORT || 25; const client = net.createConnection(port, 'localhost'); client.on('connect', () => { client.end(); process.exit(0); }); client.on('error', () => process.exit(1));"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]