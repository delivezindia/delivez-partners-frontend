# FRONTEND: Partners web (port 8080) + Admin console (port 8081) as static files on nginx.
# Build context = repo root (see docker-compose.yml next to this file).
FROM node:20-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile

# Baked into the JavaScript at build time — change them = rebuild.
ARG VITE_API_URL
ARG VITE_GOOGLE_MAPS_API_KEY=
ENV VITE_API_URL=$VITE_API_URL \
    VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
RUN test -n "$VITE_API_URL" || (echo "VITE_API_URL is required (e.g. https://api.example.com)" && exit 1)
RUN pnpm --filter @delivez/partners-web --filter @delivez/admin-web build

FROM nginx:1.27-alpine
COPY deploy/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/partners-web/dist /usr/share/nginx/partners
COPY --from=build /app/apps/admin-web/dist /usr/share/nginx/admin
EXPOSE 8080 8081
