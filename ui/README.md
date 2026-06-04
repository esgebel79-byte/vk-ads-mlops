# VK Ads Reach Intelligence — Frontend

Phase 5 adds prediction history, CSV export, and enhanced system analytics on top of Phase 4 CPM sweep and auction intelligence.

Integrated API endpoints:

- `POST /predict` — single campaign reach forecast
- `POST /predict/sweep` — CPM range sweep using current campaign base parameters
- `GET /health` — backend and model readiness
- `GET /metadata` — CPM bounds, competitor thresholds, timing presets, publisher catalog, sweep limits
- `GET /predictions/recent` — in-memory recent prediction history (items array)

## Stack

- Vite
- React 18 + TypeScript (strict)
- Tailwind CSS
- TanStack Query (queries + mutations)
- React Hook Form + Zod
- Recharts (CPM sweep visualization)
- React Router
- i18next + react-i18next (English / Russian)
- lucide-react icons
- Vitest + Testing Library

## Prerequisites

- Node.js 20+
- Backend inference API running (default `http://127.0.0.1:8000`)

## Environment

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

Dev server: [http://localhost:5173](http://localhost:5173). Ensure the backend allows this origin (CORS is configured in the inference API).

### With backend

From the repository root, start the inference API (see main project docs), then run the UI as above. The dashboard loads health/metadata, submits live predictions, and history/system pages load `/predictions/recent`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start Vite dev server |
| `npm run build` | Typecheck and production build |
| `npm run preview` | Preview production build |
| `npm run test` | Run Vitest once |
| `npm run lint` | ESLint |

## Phase 5 features

- **Prediction history page** (`/history`) — table of recent predictions with summary cards, client-side filters, sort, refresh, and CSV export
- **`GET /predictions/recent` integration** — normalizes `{ items: [...] }` response; tolerates missing fields per record
- **Details drawer** — campaign request, probabilities, reach, drift, latency, collapsible JSON for developers
- **System analytics** — overview grid on System status: connection, model readiness, metadata, publisher count, CPM metadata, recent prediction metrics
- **Recent activity panel** — aggregated history metrics with link to full history
- **Refresh all** on System status — health, metadata, and recent predictions
- **Bilingual UI** — all visible strings in `src/i18n/locales/en.json` and `ru.json`

### Recent predictions API shape

```json
{
  "items": [
    {
      "prediction_id": "uuid",
      "created_at": "2025-06-01T12:00:00+00:00",
      "request": { "cpm": 20, "hour_start": 0, "hour_end": 24, "publishers": [], "audience_size": 10000, "user_ids": [] },
      "response": { "at_least_one": 0.25, "at_least_two": 0.1, "at_least_three": 0.02, "model_version": "...", "drift_flag": false, "prediction_id": "uuid" },
      "latency_seconds": 0.42,
      "drift_report": {}
    }
  ]
}
```

Sweep requests are not stored in this history (only `POST /predict` records).

### History filters and export

- Search by prediction ID (partial match)
- Drift: all / drift only / no drift
- Model version dropdown (from loaded records)
- CPM min/max range
- Sort: newest, oldest, highest/lowest CPM, highest reach, lowest latency
- CSV export uses **filtered** rows; button disabled when empty or on load error

### Empty and error states

- **Empty history** — when `items` is empty: guidance to run a campaign prediction on the dashboard
- **API error** — shared error state with retry (no stack traces)
- **Missing fields** — cells show translated “Unavailable” instead of crashing
- **Partial records** — normalization skips completely empty entries; keeps partial data when possible

## Phase 4 features (summary)

- CPM sweep panel, Recharts chart, auction intelligence, two-column dashboard layout

## Pages

- `/` — Dashboard: model readiness, campaign prediction, CPM sweep, auction intelligence
- `/history` — Prediction history with filters, export, and details drawer
- `/system` — System status with analytics overview, recent activity, artifacts, metadata

## Testing

```bash
npm run test
```

Unit tests mock API modules; no live backend is required. Coverage includes history normalization, summary metrics, filtering, sorting, CSV export, history page empty state, details drawer, system recent activity panel, and language switcher.

## Limitations

- History is in-memory on the backend and capped by `max_recent_predictions` (see metadata limits)
- Only single `POST /predict` calls appear in history (not sweep points)
- Publisher labels are IDs only (no fake names)
- Requires `VITE_API_BASE_URL` at runtime
