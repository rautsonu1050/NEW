# Build stage
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install bash and coreutils which are required by the build scripts
RUN apt-get update && apt-get install -y bash coreutils && rm -rf /var/lib/apt/lists/*

# Install dependencies first for better layer caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Run the project build scripts
RUN npm run build

# Production stage
FROM node:22-bookworm-slim

WORKDIR /app

# Install bash required for start scripts
RUN apt-get update && apt-get install -y bash coreutils && rm -rf /var/lib/apt/lists/*

# Copy built application from the builder stage
COPY --from=builder /app ./

# Set environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0

# Expose common ports (vinext/vite/wrangler)
EXPOSE 3000
EXPOSE 5173
EXPOSE 8787

# Start the application
CMD ["npm", "start"]
