# VK Ads Reach Intelligence — Frontend

Phase 2 frontend for the VK Ads reach prediction MLOps platform. This release connects only to:

- `GET /health`
- `GET /metadata`

Prediction, sweep, and recent-prediction endpoints are planned for later phases.

## Stack

- Vite
- React 18 + TypeScript (strict)
- Tailwind CSS
- TanStack Query (server state)
- React Router
- i18next + react-i18next (English / Russian)
- lucide-react icons
- Vitest + Testing Library

## Prerequisites

- Node.js 20+
- Backend inference API running (default `http://127.0.0.1:8000`)

## Environment

Copy the example env file and adjust if needed:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Base URL for the inference API (no trailing slash required) |

Example:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## Local setup

```bash
cd ui
npm install
cp .env.example .env
npm run dev
```

The dev server runs at [http://localhost:5173](http://localhost:5173) by default. Ensure the backend allows this origin (CORS is preconfigured in the inference API).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Typecheck and production build |
| `npm run preview` | Preview production build |
| `npm run test` | Run Vitest once |
| `npm run lint` | ESLint (if dependencies installed) |

## Pages

- `/` — Dashboard with model readiness, health, metadata, and next-module placeholder
- `/system` — Detailed system status with refresh and last-updated timestamp

## Testing

```bash
npm run test
```

## Expected backend

Start the inference API from the repository root (see main project docs), for example on port `8000`. The UI reads live data only; it does not mock predictions or charts in this phase.

## Limitations (Phase 2)

- No campaign prediction UI
- No sweep or recent-predictions views
- Requires a reachable API for full content; otherwise shows loading/error states
