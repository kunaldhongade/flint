# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy root manifests
COPY package.json package-lock.json ./

# Copy package manifests
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/

# Install dependencies (including workspace links)
RUN npm ci

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/backend ./packages/backend

# Build shared package first
WORKDIR /app/packages/shared
RUN npm run build

# Build backend package
WORKDIR /app/packages/backend
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy necessary files from builder
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/backend/dist ./packages/backend/dist
COPY --from=builder /app/packages/backend/package.json ./packages/backend/
COPY --from=builder /app/packages/shared/src/abi ./packages/shared/src/abi

WORKDIR /app/packages/backend

EXPOSE 3000

CMD ["node", "dist/index.js"]
