# Delivez Partners — Frontend

Partners web app (restaurants, pharmacies, labs, stores) and the Delivez admin console. React + Vite + Tailwind.
The API lives in [delivez-partners-backend](https://github.com/delivezindia/delivez-partners-backend).

| App | Path | Local URL | Server |
|---|---|---|---|
| Partners web | `apps/partners-web` | http://localhost:5173 | port 8080 → `partners.<domain>` |
| Admin console | `apps/admin-web` | http://localhost:5174 | port 8081 → `admin.<domain>` |
| Translations (8 languages) | `packages/i18n` | | |
| Design tokens | `packages/ui/src/tokens.css` | | |

## Deploy (Docker)
Needs Docker + Docker Compose v2.
```bash
git clone https://github.com/delivezindia/delivez-partners-frontend.git && cd delivez-partners-frontend/deploy/frontend
cp .env.example .env        # VITE_API_URL=https://api.<domain>  (+ VITE_GOOGLE_MAPS_API_KEY)
docker compose up -d --build
```
Put HTTPS in front: `partners.<domain>` → :8080, `admin.<domain>` → :8081.
On the backend, `CORS_ORIGINS` must list both frontend addresses and `PUBLIC_API_URL` must equal `VITE_API_URL`.

**Update:** `git pull && docker compose up -d --build` (settings are built in, so .env changes need `--build`).

**Without Docker:** any static host works (Azure Static Web Apps, Netlify, Vercel…):
`pnpm install && VITE_API_URL=https://api.<domain> pnpm build`, publish `apps/partners-web/dist` and `apps/admin-web/dist`, enable single-page-app fallback to `index.html`.

## Local development
1. Node 20+, `npm i -g pnpm@9`, and the backend running on http://localhost:4000.
2. `cp .env.example .env` · `pnpm install` · `pnpm dev`
