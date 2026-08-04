# ---- Builder: has the full toolchain to compile TypeScript -> dist ----
FROM node:22-bookworm-slim AS builder
WORKDIR /app
# Copy manifests first so this layer caches unless deps change.
COPY package*.json ./
RUN npm ci
# Generate the Prisma client (needs the schema), then compile.
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

# ---- Runtime: production deps only, non-root ----
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
# Prod deps only (still includes the prisma CLI — moved to dependencies for migrate deploy).
RUN npm ci --omit=dev
# Regenerate the client for this stage; build+runtime share the base image, so Prisma's
# `native` engine target matches (no binaryTargets needed).
COPY prisma ./prisma
RUN npx prisma generate
# Only the compiled output comes from the builder — the TS toolchain stays behind.
COPY --from=builder /app/dist ./dist
# Drop root: the official node image ships a non-root `node` user.
USER node
EXPOSE 3100
# Apply committed migrations, then start. Config (DATABASE_URL, secrets, PORT) is injected as env.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
