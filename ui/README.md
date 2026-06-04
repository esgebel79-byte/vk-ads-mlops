# VK Ads Reach Intelligence — Frontend

Phase 4 adds CPM sensitivity sweep, auction intelligence, and charting on top of Phase 3 campaign prediction.

Integrated API endpoints:

- `POST /predict` — single campaign reach forecast
- `POST /predict/sweep` — CPM range sweep using current campaign base parameters
- `GET /health` — backend and model readiness
- `GET /metadata` — CPM bounds, competitor thresholds, timing presets, publisher catalog, sweep limits

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

From the repository root, start the inference API (see main project docs), then run the UI as above. The dashboard loads health/metadata, submits live `POST /predict` and `POST /predict/sweep` requests.

## Scripts

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start Vite dev server |
| `npm run build` | Typecheck and production build |
| `npm run preview` | Preview production build |
| `npm run test` | Run Vitest once |
| `npm run lint` | ESLint |

## Phase 4 features

- **CPM sweep panel** — configure min/max/step CPM range; uses current campaign form values (forecast duration, publishers, audience, user IDs) as `base_request`
- **Recharts sweep chart** — toggle between predicted unique reach and impression probabilities; competitor threshold reference lines when metadata provides them
- **Sweep summary cards** — best CPM by reach (lowest CPM on ties), highest reach, point count, model version, latency, drift-flagged points
- **Auction intelligence panel** — guaranteed win, edge-rate, low competitiveness (only when thresholds exist), sweep drift warnings, session burnout note
- **Two-column dashboard layout** — campaign form on the left; prediction results, sweep, and intelligence on the right (stacked on smaller screens)
- **Bilingual UI** — all visible strings in `src/i18n/locales/en.json` and `ru.json`

### Example sweep request

```json
{
  "base_request": {
    "hour_start": 0,
    "hour_end": 24,
    "publishers": [101, 204],
    "audience_size": 50000,
    "user_ids": []
  },
  "cpm_range": {
    "min": 5,
    "max": 60,
    "step": 5
  }
}
```

The UI builds `base_request` from the campaign form (forecast duration maps to `hour_end` with `hour_start: 0`).

### Example sweep response

```json
{
  "sweep_id": "uuid",
  "points": [
    {
      "cpm": 5,
      "at_least_one": 0.21,
      "at_least_two": 0.08,
      "at_least_three": 0.02,
      "predicted_reach": 10500,
      "drift_flag": false
    }
  ],
  "model_version": "deepsets_attention",
  "latency_seconds": 1.23
}
```

### Model unavailable behavior

- If `model_ready` or `model_loaded` is false, a warning banner appears; forms and sweep controls remain visible.
- `POST /predict` or `POST /predict/sweep` returning **503** shows a dedicated unavailable state with backend detail when present (no stack traces).
- **422** and other errors use the shared error state with retry.

### Auction intelligence limitations

- Competitor CPM win-rate guidance (guaranteed win, edge case, low competitiveness) requires both `median_competitor_cpm` and `max_competitor_cpm` in metadata with `source` not equal to `"unavailable"`.
- When thresholds are missing, the UI shows an informational “limited intelligence” card and does not invent win probabilities.
- Session burnout guidance uses `metadata.time.session_silence_window_hours` when available.

### Sweep validation

- Client-side Zod checks: `min >= 0`, `max >= min`, `step > 0`, finite numbers, point count `floor((max - min) / step) + 1` ≤ `metadata.limits.max_sweep_points` (fallback max: 50).

## Pages

- `/` — Dashboard: model readiness, campaign prediction, CPM sweep, auction intelligence, compact system overview
- `/system` — Full system status with refresh

## Testing

```bash
npm run test
```

Unit tests mock API modules; no live backend is required. Coverage includes sweep controls validation, summary tie-breaking, auction intelligence scenarios, session burnout, dashboard render, and language switcher.

## Limitations

- No recent-predictions history UI (`GET /predictions/recent`)
- Publisher labels are IDs only (no fake names)
- Chart and threshold markers only appear after a successful sweep or when metadata provides competitor CPM statistics
- Requires `VITE_API_BASE_URL` at runtime
