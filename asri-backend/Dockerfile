# ---- Stage 1: Install dependencies ----
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

# ---- Stage 2: Runtime image ----
FROM node:18-alpine AS runner
WORKDIR /app

# Jalankan sebagai user non-root demi keamanan
RUN addgroup -S nodegrp && adduser -S nodeusr -G nodegrp

ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .

USER nodeusr

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "src/server.js"]
