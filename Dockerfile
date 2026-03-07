FROM oven/bun:1.3.10

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Create non-root user and switch to it
RUN groupadd -r appgroup && useradd -r -g appgroup appuser && \
    chown -R appuser:appgroup /app
USER appuser

# Expose port
EXPOSE 3000

# Start the application
CMD ["bun", "index.ts"]
