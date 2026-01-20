# Builder stage
FROM node:20-slim AS builder
WORKDIR /app

# Copy root manifests first for caching
COPY package.json package-lock.json ./
# Copy shared workspace definitions if any (frontend has minimal shared dependencies usually, but good practice)
COPY packages/shared/package.json ./packages/shared/
COPY packages/frontend/package.json ./packages/frontend/

# Install build tools
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Install dependencies
RUN npm ci

# Copy source
COPY packages/shared ./packages/shared
COPY packages/frontend ./packages/frontend

# Build frontend
WORKDIR /app/packages/frontend
# Pass public env vars at build time
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_PRIVY_APP_ID
ARG NEXT_PUBLIC_DECISION_VERIFIER_ADDRESS
ARG NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS
ARG NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS
ARG NEXT_PUBLIC_FEE_MANAGER_ADDRESS
ARG NEXT_PUBLIC_DECISION_LOGGER_ADDRESS
ARG NEXT_PUBLIC_PORTFOLIO_MANAGER_ADDRESS
ARG NEXT_PUBLIC_MOCK_ERC20_ADDRESS

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_PRIVY_APP_ID=$NEXT_PUBLIC_PRIVY_APP_ID
ENV NEXT_PUBLIC_DECISION_VERIFIER_ADDRESS=$NEXT_PUBLIC_DECISION_VERIFIER_ADDRESS
ENV NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS=$NEXT_PUBLIC_IDENTITY_REGISTRY_ADDRESS
ENV NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS=$NEXT_PUBLIC_REPUTATION_REGISTRY_ADDRESS
ENV NEXT_PUBLIC_FEE_MANAGER_ADDRESS=$NEXT_PUBLIC_FEE_MANAGER_ADDRESS
ENV NEXT_PUBLIC_DECISION_LOGGER_ADDRESS=$NEXT_PUBLIC_DECISION_LOGGER_ADDRESS
ENV NEXT_PUBLIC_PORTFOLIO_MANAGER_ADDRESS=$NEXT_PUBLIC_PORTFOLIO_MANAGER_ADDRESS
ENV NEXT_PUBLIC_MOCK_ERC20_ADDRESS=$NEXT_PUBLIC_MOCK_ERC20_ADDRESS

RUN npm run build

# Runner stage
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"

# Copy built assets
# COPY --from=builder /app/packages/frontend/public ./public
COPY --from=builder /app/packages/frontend/.next/standalone ./
COPY --from=builder /app/packages/frontend/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "packages/frontend/server.js"]
