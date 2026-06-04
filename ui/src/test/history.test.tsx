import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import i18n from "@/i18n";
import { PredictionHistoryDetailsDrawer } from "@/features/history/components/PredictionHistoryDetailsDrawer";
import { PredictionHistorySummary } from "@/features/history/components/PredictionHistorySummary";
import { HistoryPage } from "@/pages/HistoryPage";
import { SystemStatusPage } from "@/pages/SystemStatusPage";
import type { NormalizedPredictionRecord } from "@/features/history/types";
import {
  applyHistoryFilters,
  computeHistorySummary,
  exportHistoryToCsv,
  normalizeRecentPredictions,
} from "@/features/history/utils";
import { LanguageSwitcher } from "@/shared/components/LanguageSwitcher";

vi.mock("@/features/history/api", () => ({
  getRecentPredictions: vi.fn(),
}));

vi.mock("@/features/system/api", () => ({
  getHealth: vi.fn(() =>
    Promise.resolve({
      status: "ok",
      model_loaded: true,
      model_ready: true,
      artifacts: {
        model: { path: "/model", exists: true },
      },
    }),
  ),
  getMetadata: vi.fn(() =>
    Promise.resolve({
      model_ready: true,
      model_loaded: true,
      model_version: "deepsets_attention",
      publisher_universe: [101],
      cpm: {
        min: 0,
        max: 100,
        step: 5,
        median_competitor_cpm: 10,
        max_competitor_cpm: 50,
        source: "artifact",
      },
      time: {
        mode: "absolute_hours",
        min_hour: 0,
        max_hour: 168,
        recommended_presets: [24],
        session_silence_window_hours: 4,
      },
      limits: {
        max_sweep_points: 50,
        max_recent_predictions: 100,
      },
    }),
  ),
}));

import { getRecentPredictions } from "@/features/history/api";

const mockGetRecent = vi.mocked(getRecentPredictions);

function makeRecord(
  overrides: Partial<NormalizedPredictionRecord> & {
    request?: NormalizedPredictionRecord["request"];
    response?: NormalizedPredictionRecord["response"];
  } = {},
): NormalizedPredictionRecord {
  return {
    id: "rec-1",
    predictionId: "pred-abc",
    createdAt: "2025-06-01T12:00:00.000Z",
    request: {
      cpm: 20,
      hour_start: 0,
      hour_end: 24,
      publishers: [101],
      audience_size: 10000,
      user_ids: [],
    },
    response: {
      at_least_one: 0.25,
      at_least_two: 0.1,
      at_least_three: 0.02,
      model_version: "v1",
      drift_flag: false,
      prediction_id: "pred-abc",
    },
    latencySeconds: 0.5,
    modelVersion: "v1",
    driftFlag: false,
    ...overrides,
  };
}

function renderWithProviders(ui: ReactElement, route = "/history") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe("history utils", () => {
  it("normalizes items wrapper from API", () => {
    const records = normalizeRecentPredictions({
      items: [
        {
          prediction_id: "p1",
          created_at: "2025-01-01T00:00:00Z",
          request: {
            cpm: 10,
            hour_start: 0,
            hour_end: 12,
            publishers: [],
            audience_size: 1000,
            user_ids: [],
          },
          response: {
            at_least_one: 0.2,
            at_least_two: 0.05,
            at_least_three: 0.01,
            model_version: "m1",
            drift_flag: true,
            prediction_id: "p1",
          },
          latency_seconds: 1.2,
        },
      ],
    });
    expect(records).toHaveLength(1);
    expect(records[0]?.predictionId).toBe("p1");
    expect(records[0]?.driftFlag).toBe(true);
  });

  it("computes summary total and average latency", () => {
    const records = [
      makeRecord({ latencySeconds: 1 }),
      makeRecord({
        id: "rec-2",
        predictionId: "pred-2",
        latencySeconds: 3,
        driftFlag: true,
      }),
    ];
    const summary = computeHistorySummary(records);
    expect(summary.total).toBe(2);
    expect(summary.averageLatencySeconds).toBe(2);
    expect(summary.driftWarningCount).toBe(1);
  });

  it("filters by drift", () => {
    const records = [
      makeRecord({ driftFlag: false }),
      makeRecord({
        id: "r2",
        predictionId: "p2",
        driftFlag: true,
        request: { ...makeRecord().request!, cpm: 5 },
      }),
    ];
    const filtered = applyHistoryFilters(records, {
      search: "",
      drift: "drift",
      modelVersion: "",
      cpmMin: null,
      cpmMax: null,
      sort: "newest",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.driftFlag).toBe(true);
  });

  it("sorts by CPM descending", () => {
    const records = [
      makeRecord({ request: { ...makeRecord().request!, cpm: 10 } }),
      makeRecord({
        id: "r2",
        request: { ...makeRecord().request!, cpm: 50 },
      }),
    ];
    const sorted = applyHistoryFilters(records, {
      search: "",
      drift: "all",
      modelVersion: "",
      cpmMin: null,
      cpmMax: null,
      sort: "cpm_high",
    });
    expect(sorted[0]?.request?.cpm).toBe(50);
  });

  it("exports valid CSV with headers", () => {
    const csv = exportHistoryToCsv([makeRecord()]);
    const lines = csv.split("\n");
    expect(lines[0]).toContain("prediction_id");
    expect(lines[0]).toContain("timestamp");
    expect(lines[1]).toContain("pred-abc");
    expect(lines[1]).toContain("20");
  });
});

describe("HistoryPage", () => {
  beforeEach(() => {
    void i18n.changeLanguage("en");
    mockGetRecent.mockReset();
  });

  it("renders history page title", async () => {
    mockGetRecent.mockResolvedValue([]);
    renderWithProviders(<HistoryPage />);
    expect(
      await screen.findByRole("heading", { name: "Prediction history" }),
    ).toBeInTheDocument();
  });

  it("renders empty history state", async () => {
    mockGetRecent.mockResolvedValue([]);
    renderWithProviders(<HistoryPage />);
    expect(
      await screen.findByText("No prediction history yet"),
    ).toBeInTheDocument();
  });

  it("renders summary with total predictions", async () => {
    mockGetRecent.mockResolvedValue([makeRecord(), makeRecord({ id: "r2" })]);
    renderWithProviders(<HistoryPage />);
    expect(
      await screen.findByText("Total recent predictions"),
    ).toBeInTheDocument();
    const card = screen
      .getByText("Total recent predictions")
      .closest("article");
    expect(card).not.toBeNull();
    expect(within(card!).getByText("2")).toBeInTheDocument();
  });

  it("renders details drawer for selected record", async () => {
    const record = makeRecord();
    renderWithProviders(
      <PredictionHistoryDetailsDrawer
        record={record}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("dialog", { name: /Prediction details/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("pred-abc")).toBeInTheDocument();
    expect(screen.getByText("Campaign request")).toBeInTheDocument();
  });
});

describe("PredictionHistorySummary", () => {
  it("shows drift warning count", () => {
    renderWithProviders(
      <PredictionHistorySummary
        summary={computeHistorySummary([
          makeRecord({ driftFlag: true }),
          makeRecord({ id: "r2", driftFlag: false }),
        ])}
      />,
    );
    const driftCard = screen
      .getByText("Drift warnings")
      .closest("article");
    expect(within(driftCard!).getByText("1")).toBeInTheDocument();
  });
});

describe("SystemStatusPage with recent activity", () => {
  beforeEach(() => {
    void i18n.changeLanguage("en");
    mockGetRecent.mockResolvedValue([makeRecord()]);
  });

  it("renders recent activity panel", async () => {
    renderWithProviders(<SystemStatusPage />, "/system");
    expect(
      await screen.findByText("Recent prediction activity"),
    ).toBeInTheDocument();
    expect(screen.getByText("Open full history")).toBeInTheDocument();
  });
});

describe("Language switcher", () => {
  it("still works after history additions", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LanguageSwitcher />);
    await user.click(screen.getByRole("button", { name: "Русский" }));
    expect(i18n.language).toMatch(/^ru/);
  });
});
