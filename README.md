# VibeShype Pulse

React web and Electron desktop app for YouTube channel discovery and music opportunities, with a portable Node.js backend. Run it on your own Windows, macOS, or Linux computer, a home server, or a VPS. No connection to the original deployment is required.

## Requirements

- Node.js 22.12 or newer (Node 22 LTS recommended) and npm.
- Your own YouTube Data API v3 key for live YouTube features.
- Your own Anthropic key for AI niche analysis. Optional OpenAI embeddings require PostgreSQL with pgvector.

## Try the app without external services

```sh
git clone https://github.com/petercodes07/vibeshype-pulse.git
cd vibeshype-pulse
npm ci
cp .env.example .env
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`. Open the local address printed by Vite. The example enables demo mode: log in with `demo@pulse.app` / `password123`, using code `123456`. This is browser-local mock data, not real authentication.

## Run your own backend

```sh
npm --prefix server ci
cp server/.env.example server/.env
npm run db:migrate
npm run dev:all
```

Put your own keys in `server/.env`. Set these values in the root `.env` for live Pulse data with a demo account:

```dotenv
VITE_USE_MOCK=false
VITE_USE_MOCK_AUTH=true
API_PROXY_TARGET=http://127.0.0.1:3001
```

Restart Vite after changing its configuration. The backend defaults to SQLite at `server/data/pulse.sqlite`; the schema is created automatically. No separate database service is needed. Local database files are excluded from Git. `npm --prefix server test` checks the database adapter without using API keys or external services.

For vector-based competitor recommendations, install PostgreSQL with the pgvector extension on a machine you control, set `DATABASE_URL` privately in `server/.env`, and run `npm run db:migrate`. Set your own `OPENAI_API_KEY` to enable embeddings. SQLite supports channel/video storage; vector similarity requires PostgreSQL.

## Use any computer as the server

Build and serve the app and API together:

```sh
npm run build
npm start
```

Set `SERVE_WEB=true` in `server/.env` first. `HOST=127.0.0.1` listens on that computer only. To use the app from other devices on your network, set `HOST=0.0.0.0`, choose `PORT`, restart, and visit `http://YOUR_SERVER_HOST:PORT` on those devices. The app uses same-origin API requests by default, so there is no deployment address hardcoded into it. Only allow the chosen port through your own firewall.

To host the frontend separately, set `VITE_API_URL` in the root `.env` to the URL of your server before building. Set `CORS_ORIGINS` in `server/.env` to the exact frontend origins, separated by commas. For the Vite development server itself to accept LAN connections, set `DEV_HOST=0.0.0.0` in the root `.env`. Use HTTPS and access control when exposing a deployment beyond your trusted network.

## Authentication and persistence limits

This repository's backend implements Pulse, rivals, competitors, and YouTube routes. It does **not** include the original website's account/email service. Demo authentication is suitable for local evaluation only. For real accounts, provide a compatible `/api/auth/*` service, set `VITE_AUTH_API_URL` to its origin, and disable both mock flags. The Pulse routes do not validate account tokens; add authentication middleware before making a multi-user public service. Peer selections and recommendation actions are in memory and reset when the backend restarts. Channel and video records persist in the configured database.

## Desktop and mobile

`npm run electron:dev` launches the desktop app. Before packaging with `npm run electron:build`, configure `VITE_API_URL` with your own reachable backend address. The packaged app needs a backend for live data; it does not install a server automatically. Capacitor projects can be synced with `npm run cap:sync`, then opened using `npm run cap:android` or `npm run cap:ios`.

## Private configuration

Only empty or generic `.env.example` templates belong in Git. Keep `.env` files, API keys, private hostnames, IP addresses, database files, certificates, logs, and local exports out of commits. All `VITE_*` variables are visible in browser bundles; they must never contain credentials. This repository includes application source, not the original server's configuration or data.
