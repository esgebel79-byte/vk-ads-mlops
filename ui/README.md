# VK Ads Reach Intelligence — Frontend

Phase 5.6 refines dashboard copy and layout for marketers. Phase 5.5 applies supervisor UI requirements compliance before Docker integration. Phase 5 adds prediction history, CSV export, and enhanced system analytics on top of Phase 4 CPM sweep and auction intelligence.

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

## Dashboard UX cleanup (Phase 5.6)

- **Dashboard (`/`)** — marketer-facing: hero, single model-readiness banner, campaign setup, results, winning probability, CPM sweep, and auction intelligence. A compact **Service snapshot** strip shows high-level status only (no artifact paths or full metadata tables).
- **System status (`/system`)** — operator/developer-facing: health, analytics, recent activity, and a collapsible **Technical details** section with artifact paths and full service metadata.
- **Unavailable states** — missing model artifacts show calm warning/neutral copy (not raw `/app/...` paths or `.npy` filenames on the dashboard).
- **i18n** — all visible dashboard and system strings live in `src/i18n/locales/en.json` and `ru.json`.

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

## Requirements compliance (Phase 5.5)

The dashboard is organized into three supervisor blocks:

### Block A — Campaign inputs

- CPM, target segment / publisher group, forecast duration, audience size, and calculate button
- Segments are labeled in marketer-friendly language; backend publisher IDs render as “Publisher 101” / “Площадка 101”
- Segment selection is **required** when `metadata.publisher_universe` has items; when empty, a warning is shown and `publishers: []` is allowed
- Main CPM input step uses `metadata.cpm.step` only when it is `0.1` or `1`; otherwise falls back to `0.1` (sweep step remains separate)

### Block B — Prediction visualization

- Predicted unique reach, probability cards, CPM sweep chart, and **Winning probability** indicator (progress bar + status badge)
- Win probability uses competitor thresholds from `metadata.cpm` (max for guaranteed/edge, median for low competitiveness)
- When model artifacts are missing (503), polished unavailable states are shown — no mock chart or prediction data

### Block C — Auction and session alerts

- Smart notifications for guaranteed win, edge-rate (~50%), low competitiveness, drift, and session burnout
- Session limitation explains that ads are not repeated in the same session; hours come from `metadata.time.session_silence_window_hours`, with **6 hours** as explanatory fallback when metadata is missing

### Metadata and artifacts unavailable

- Empty `publisher_universe`: warning + optional broad targeting (no fake publisher names)
- Missing competitor CPM thresholds: win probability shows “unknown” — no fake 100% or 50%
- Model not ready: form warning and unavailable result/sweep states

### English / Russian

All visible UI strings live in `src/i18n/locales/en.json` and `ru.json`. Use the header language switcher to toggle locales.

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

- `/` — Dashboard (marketer-facing): campaign prediction, CPM sweep, auction intelligence, service snapshot
- `/history` — Prediction history with filters, export, and details drawer
- `/system` — System status with analytics overview, recent activity, artifacts, metadata

## Testing

```bash
npm run test
```

Unit tests mock API modules; no live backend is required. Coverage includes dashboard UX cleanup (no artifact paths on dashboard, single readiness banner, disabled actions when model not ready), requirements compliance (segment labels/validation, CPM step, win probability indicator, session limitation), history normalization, summary metrics, filtering, sorting, CSV export, history page empty state, details drawer, system technical details accordion, and language switcher.

## Limitations

- History is in-memory on the backend and capped by `max_recent_predictions` (see metadata limits)
- Only single `POST /predict` calls appear in history (not sweep points)
- Publisher labels are IDs only (no fake names)
- Requires `VITE_API_BASE_URL` at runtime
