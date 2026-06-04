# VK Ads Reach Intelligence — Frontend

Phase 3 adds the campaign prediction workspace and integrates:

- `POST /predict` — campaign reach forecast
- `GET /health` — backend and model readiness
- `GET /metadata` — CPM, timing presets, publisher catalog, limits

Sweep and recent-predictions views remain out of scope.

## Stack

- Vite
- React 18 + TypeScript (strict)
- Tailwind CSS
- TanStack Query (queries + mutations)
- React Hook Form + Zod
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

From the repository root, start the inference API (see main project docs), then run the UI as above. The dashboard loads health/metadata and submits live `POST /predict` requests.

## Scripts

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start Vite dev server |
| `npm run build` | Typecheck and production build |
| `npm run preview` | Preview production build |
| `npm run test` | Run Vitest once |
| `npm run lint` | ESLint |

## Phase 3 features

- **Campaign prediction panel** on the dashboard: CPM, forecast duration (from metadata presets or defaults), publisher multi-select, audience size, optional user IDs
- **Results**: predicted unique reach (`audience_size × at_least_one`), impression probabilities, model version, prediction ID
- **Alerts**: drift, model readiness, metadata/publisher gaps, session silence window, competitor CPM thresholds (only when provided by metadata)
- **Bilingual UI** — all visible strings in `src/i18n/locales/en.json` and `ru.json`

### Example predict request

```json
{
  "cpm": 12.5,
  "hour_start": 0,
  "hour_end": 24,
  "publishers": [101, 204],
  "audience_size": 50000,
  "user_ids": []
}
```

The form maps **forecast duration** to `hour_start: 0` and `hour_end: <selected hours>`.

### Model unavailable behavior

- If `model_ready` or `model_loaded` is false, a warning banner appears; the form stays usable.
- `POST /predict` returning **503** shows a dedicated unavailable state with backend detail when present (no stack traces).
- **422** and other errors use the shared error state with retry.

## Pages

- `/` — Dashboard: model readiness, campaign prediction (primary), compact system overview
- `/system` — Full system status with refresh

## Testing

```bash
npm run test
```

Unit tests mock API modules; no live backend is required. Coverage includes form validation, user ID parsing, result percentages, unavailable state, dashboard render, and language switcher.

## Limitations

- No CPM sweep or recent-predictions UI
- Publisher labels are IDs only (no fake names)
- Competitor CPM alerts require both median and max from metadata
- Requires `VITE_API_BASE_URL` at runtime
