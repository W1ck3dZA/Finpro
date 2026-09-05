# Debian-based (not alpine) so bcrypt's prebuilt native binary works without a musl mismatch.
FROM node:22-bookworm-slim

# Prisma's schema-engine binary (used by `migrate deploy`) needs libssl to be present explicitly.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npx prisma generate
RUN npm run build

EXPOSE 4000

# migrate deploy only applies pending migrations (safe/idempotent against an already-migrated
# database); db seed is a no-op once any user exists. Both safe to run on every container start.
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && node dist/index.js"]
