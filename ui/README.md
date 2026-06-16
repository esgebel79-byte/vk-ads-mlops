# VK Ads Reach Intelligence — Frontend

Marketer-facing dashboard for campaign reach prediction, CPM scenario analysis, and system monitoring. Technical diagnostics live on the System status page.

## Stack

- Vite
- React 18 + TypeScript
- Tailwind CSS
- TanStack Query
- React Hook Form + Zod
- Recharts
- React Router
- i18next (English / Russian)
- Vitest + Testing Library

## Routes

| Path | Page |
|------|------|
| `/` | Campaign prediction dashboard |
| `/history` | Prediction history, filters, CSV export |
| `/system` | System status and technical details |

## Environment

Copy the example env file and set the inference API URL:

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Backend API base URL (no trailing slash) |

Example for local dev:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

For Docker Compose production build, the image is built with `VITE_API_BASE_URL=http://localhost:8000` (browser calls the host-mapped API port).

## Local development

```bash
cd ui
npm install
cp .env.example .env
npm run dev
```

Dev server: http://localhost:5173  
Backend expected at: http://127.0.0.1:8000

## Production build

```bash
npm run build
```

Output: `dist/` (served by nginx in Docker).

Preview locally:

```bash
npm run preview
```

## Tests

```bash
npm run test
```

Unit tests mock API modules; no live backend required.

## Docker

The production image is built from the repository root:

```bash
docker compose up -d --build ui
```

Or start the full stack (API, UI, MLflow, Prometheus, Grafana):

```bash
docker compose up -d --build
```

Frontend URL: http://localhost:3001

Files:

- `Dockerfile` — multi-stage Node build + nginx
- `nginx.conf` — SPA routing for `/`, `/history`, `/system`
- `.dockerignore` — excludes `node_modules`, `dist`, secrets

## Notes

- UI copy is marketer-facing; artifact paths and raw metadata appear only under **System status → Technical details**.
- User IDs are not shown on the dashboard; the backend samples audience when `user_ids` is empty.
- History is in-memory on the backend; sweep points are not stored per point.
- Requires `VITE_API_BASE_URL` at build/dev time.

See the [root README](../README.md) for backend setup, DVC artifacts, and full-stack Docker instructions.
