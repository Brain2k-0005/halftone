# Halftone dashboard (TanStack Start, built with Nitro's node-server preset).
# Build context: this folder (dashboard/).
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund
COPY . .
ENV NITRO_PRESET=node-server
RUN npm run build

FROM node:24-bookworm-slim AS run
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0 BRANDING_FILE=/app/data/branding.json
WORKDIR /app
COPY --from=build --chown=node:node /app/.output ./.output
# Instance branding (Admin → Branding) is stored here; mount a volume to keep it.
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/login').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"
CMD ["node", ".output/server/index.mjs"]
