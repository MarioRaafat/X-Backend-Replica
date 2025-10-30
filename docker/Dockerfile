# -------- BUILDER STAGE --------
FROM node:24-alpine AS builder

WORKDIR /app

ENV HUSKY=0
# Copy only dependency files first for better layer caching
COPY package*.json ./

# Install dependencies for building (includes dev)
RUN npm ci

# Copy source
COPY . .

# Build the app
RUN npm run build

# Prune unnecessary dev dependencies
RUN npm prune --omit=dev


# -------- PRODUCTION STAGE --------
FROM node:24-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

# Copy only needed files
COPY package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/assets ./assets

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

CMD ["node", "dist/main.js"]
