FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder
COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8787
ENV CLIENT_DIST_DIR=dist/client

RUN apk add --no-cache curl \
  && addgroup --system --gid 1001 app \
  && adduser --system --uid 1001 app

COPY --from=builder --chown=app:app /app/package.json ./package.json
COPY --from=builder --chown=app:app /app/package-lock.json ./package-lock.json
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/scripts ./scripts
COPY --from=builder --chown=app:app /app/erialad ./erialad
COPY --from=builder --chown=app:app /app/valdkonnad ./valdkonnad

USER app

EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/api/health" >/dev/null || exit 1

CMD ["node", "scripts/start-production.mjs"]
