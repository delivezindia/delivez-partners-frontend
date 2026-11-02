#!/usr/bin/env bash
# Delivez frontend: install → build. nginx serves the new files immediately (no restart needed).
# Runs automatically after every `git pull` (post-merge hook), or by hand: ./deploy/frontend/update.sh
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

STEP="start"
trap 'echo "✘ Update stopped at: $STEP. The sites still show the previous build — fix the error above, then run ./deploy/frontend/update.sh again." >&2' ERR

if ! grep -q '^VITE_API_URL=.\+' .env 2>/dev/null; then
  echo "✘ Set VITE_API_URL in .env (e.g. VITE_API_URL=https://api.example.com) before building." >&2
  exit 1
fi
if [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  echo "✘ Node.js 20 or newer is needed (this server has $(node -v))." >&2
  exit 1
fi

echo "▶ Delivez frontend: updating to $(git rev-parse --short HEAD) (node $(node -v), pnpm $(pnpm -v))"
STEP="install (pnpm install)"
pnpm install --frozen-lockfile
STEP="build (pnpm build)"
pnpm build
# Each site should now load these files (view-source on the site and compare).
for app in partners-web admin-web local-web; do
  echo "  $app: $(grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' apps/$app/dist/index.html | head -1)"
done
echo "✔ Frontend built: apps/partners-web/dist, apps/admin-web/dist and apps/local-web/dist"
