# Delivez Partners — Frontend

Partners web app (restaurants, pharmacies, labs, stores), the Delivez admin console and the customer app (Delivez Local). React + Vite + Tailwind.
The API lives in [delivez-partners-backend](https://github.com/delivezindia/delivez-partners-backend).

| App | Path | Local URL | Built files (served by nginx) |
|---|---|---|---|
| Partners web | `apps/partners-web` | http://localhost:5173 | `apps/partners-web/dist` → `partners.delivez.com` |
| Admin console | `apps/admin-web` | http://localhost:5174 | `apps/admin-web/dist` → `partners.admin.delivez.com` |
| Customer app (Local) | `apps/local-web` | http://localhost:5175 | `apps/local-web/dist` → `local.delivez.com` |
| Translations (8 languages) | `packages/i18n` | | |
| Design tokens | `packages/ui/src/tokens.css` | | |

## Server setup (once)
Needs **Node.js 20+**, **pnpm 9** (`npm i -g pnpm@9`), **git** and **nginx**.
```bash
cd /var/www && git clone https://github.com/delivezindia/delivez-partners-frontend.git && cd delivez-partners-frontend
cp .env.example .env                       # set VITE_API_URL=https://partners.api.delivez.com (+ VITE_GOOGLE_MAPS_API_KEY)
chmod +x deploy/frontend/update.sh deploy/frontend/hooks/*
git config core.hooksPath deploy/frontend/hooks   # every future git pull rebuilds automatically
./deploy/frontend/update.sh                       # first build
```
Then nginx: copy `deploy/frontend/nginx.conf` to `/etc/nginx/sites-available/`, set the domains and paths, enable it, reload nginx, and add HTTPS with `sudo certbot --nginx -d partners.delivez.com -d partners.admin.delivez.com -d local.delivez.com`.

On the backend, `CORS_ORIGINS` must list all three frontend addresses and `PUBLIC_API_URL` must equal `VITE_API_URL`.

## Updating
```bash
cd /var/www/delivez-partners-frontend && git pull
```
That's it — the hook installs and rebuilds; nginx serves the new version right away.
(After editing `.env`, run `./deploy/frontend/update.sh` once, since settings are built into the apps.)

## Local development
1. Node 20+, pnpm 9, and the backend running on http://localhost:4000.
2. `cp .env.example .env` and set `VITE_API_URL=` (empty) · `pnpm install` · `pnpm dev`
