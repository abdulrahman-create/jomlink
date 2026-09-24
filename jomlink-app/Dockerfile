# ─────────────────────────────────────────────────────────────
# JOMLINK — Production Dockerfile (VPS / standalone output)
#
# Two-stage build. Stage 1 compiles the Next.js app to `output:
# "standalone"` (see next.config.ts) which emits a self-contained
# .next/standalone server + copied static/public assets. Stage 2
# ships ONLY the runtime files, resulting in a minimal image.
#
# The app has NO database container dependency at runtime — it
# talks to the self-hosted Supabase instance via PostgREST. Server-
# only secrets (SUPABASE_SERVICE_ROLE_KEY, ToyyibPay) are injected
# at RUN time from the compose file / environment, so one image can
# be promoted across dev/staging/prod.
# ─────────────────────────────────────────────────────────────

# --- Stage 1: build -------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies first (leverages Docker layer cache).
COPY package.json package-lock.json* ./
RUN npm ci

# Bundle source + configs. Excludes are handled by .dockerignore.
COPY . .

# NEXT_PUBLIC_* values are INLINED at build time — must be present here.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# --- Stage 2: runtime -----------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

# Run as non-root (least privilege — Sentinel-AI hardening).
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Copy standalone server output + static assets.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 3000

ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]