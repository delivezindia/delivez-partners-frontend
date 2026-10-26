#!/usr/bin/env bash
# Delivez frontend: install → build. nginx serves the new files immediately (no restart needed).
# Runs automatically after every `git pull` (post-merge hook), or by hand: ./deploy/frontend/update.sh
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

if ! grep -q '^VITE_API_URL=.\+' .env 2>/dev/null; then
  echo "✘ Set VITE_API_URL in .env (e.g. VITE_API_URL=https://api.example.com) before building." >&2
  exit 1
fi

echo "▶ Delivez frontend: updating to $(git rev-parse --short HEAD)"
pnpm install --frozen-lockfile
pnpm build
echo "✔ Frontend built: apps/partners-web/dist, apps/admin-web/dist and apps/local-web/dist"
