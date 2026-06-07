import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import { AuctionIntelligencePanel } from "@/features/prediction/components/AuctionIntelligencePanel";
import { CampaignForm } from "@/features/prediction/components/CampaignForm";
import { PredictionResultCards } from "@/features/prediction/components/PredictionResultCards";
import { PredictionSummaryCard } from "@/features/prediction/components/PredictionSummaryCard";
import { SweepSummaryCards } from "@/features/prediction/components/SweepSummaryCards";
import { LanguageSwitcher } from "@/shared/components/LanguageSwitcher";
import type { CpmSweepResponse } from "@/features/prediction/types";
import type { MetadataResponse } from "@/features/system/types";

const metadataReady: MetadataResponse = {
  model_ready: true,
  model_loaded: true,
  model_version: "deepsets_attention",
  publisher_universe: [101, 204],
  cpm: {
    min: 0,
    max: 100,
    step: 0.1,
    median_competitor_cpm: 10,
    max_competitor_cpm: 20,
    source: "artifact",
  },
  time: {
    mode: "absolute_hours",
    min_hour: 0,
    max_hour: 168,
    recommended_presets: [6, 12, 24],
    session_silence_window_hours: 4,
  },
  limits: {
    max_sweep_points: 50,
    max_recent_predictions: 100,
  },
};

const sweepResponse: CpmSweepResponse = {
  sweep_id: "sweep-test-id",
  points: [
    {
      cpm: 5,
      at_least_one: 0.004,
      at_least_two: 0,
      at_least_three: 0,
      predicted_reach: 4,
      drift_flag: true,
    },
    {
      cpm: 15,
      at_least_one: 0.5,
      at_least_two: 0.2,
      at_least_three: 0.1,
      predicted_reach: 500,
      drift_flag: false,
    },
  ],
  model_version: "deepsets_attention",
  latency_seconds: 0.42,
};

function renderWithProviders(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>{ui}</MemoryRouter>
      </I18nextProvider>
    </QueryClientProvider>,
  );
}

describe("Result page marketer polish (Phase 5.11)", () => {
  beforeEach(() => {
    void i18n.changeLanguage("en");
  });

  it("renders small predicted reach explanation when reach is low", () => {
    renderWithProviders(
      <PredictionSummaryCard
        response={{
          at_least_one: 0.004,
          at_least_two: 0,
          at_least_three: 0,
          model_version: "deepsets_attention",
          drift_flag: false,
          prediction_id: "pred-low-reach",
        }}
        audienceSize={1000}
        cpm={5}
        cpmMeta={metadataReady.cpm}
      />,
    );
    expect(
      screen.getByText(/Based on 1,000 audience size × 0\.4% chance/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /This forecast is low because the current CPM is below the typical competitor level/,
      ),
    ).toBeInTheDocument();
  });

  it("renders probability card helper text", () => {
    renderWithProviders(
      <PredictionResultCards
        response={{
          at_least_one: 0.004,
          at_least_two: 0,
          at_least_three: 0,
          model_version: "deepsets_attention",
          drift_flag: false,
          prediction_id: "pred-low-reach",
        }}
      />,
    );
    expect(
      screen.getByRole("button", {
        name: "Chance that a user sees the ad at least once.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /At low CPM, repeated impressions may be unlikely/,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /usually lower than the first-impression probability/,
      }),
    ).toBeInTheDocument();
  });

  it('uses "Unusual campaign pattern" instead of distribution drift', () => {
    renderWithProviders(
      <AuctionIntelligencePanel
        cpm={5}
        metadata={metadataReady}
        predictDriftFlag
      />,
    );
    expect(screen.getByText("Unusual campaign pattern")).toBeInTheDocument();
    expect(screen.queryByText("Distribution drift detected")).not.toBeInTheDocument();
    expect(screen.queryByText(/distribution drift/i)).not.toBeInTheDocument();
  });

  it('uses "CPM scenarios" instead of "Sweep points" in sweep summary', () => {
    renderWithProviders(<SweepSummaryCards response={sweepResponse} />);
    expect(screen.getByText("CPM scenarios")).toBeInTheDocument();
    expect(screen.queryByText("Sweep points")).not.toBeInTheDocument();
  });

  it('uses "Unusual scenarios" instead of drift-flagged points', () => {
    renderWithProviders(<SweepSummaryCards response={sweepResponse} />);
    expect(screen.getByText("Unusual scenarios")).toBeInTheDocument();
    expect(screen.queryByText("Drift-flagged points")).not.toBeInTheDocument();
  });

  it("shows CPM benchmark when metadata thresholds are available", () => {
    renderWithProviders(
      <CampaignForm
        metadata={metadataReady}
        isSubmitting={false}
        onSubmit={vi.fn()}
        onResetResults={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/Competitor benchmark: median CPM 10, max CPM 20/),
    ).toBeInTheDocument();
  });

  it("does not render duplicate summary card labels", () => {
    const { container } = renderWithProviders(
      <SweepSummaryCards response={sweepResponse} />,
    );
    const labels = Array.from(
      container.querySelectorAll("p.text-xs.font-medium.uppercase"),
    ).map((node) => node.textContent?.trim());
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels.filter((label) => label === "Model version")).toHaveLength(1);
    expect(labels.filter((label) => label === "Unusual scenarios")).toHaveLength(1);
  });

  it("does not show raw technical drift wording in auction insights", () => {
    const { container } = renderWithProviders(
      <AuctionIntelligencePanel
        cpm={5}
        metadata={metadataReady}
        predictDriftFlag
        sweepPoints={sweepResponse.points}
      />,
    );
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/distribution drift/i);
    expect(text).not.toMatch(/drift_flag/i);
    expect(text).not.toMatch(/Drift-flagged/i);
  });

  it("keeps generic segment labels without fake names", () => {
    renderWithProviders(
      <CampaignForm
        metadata={metadataReady}
        isSubmitting={false}
        onSubmit={vi.fn()}
        onResetResults={vi.fn()}
      />,
    );
    expect(screen.getByText("Segment 1")).toBeInTheDocument();
    expect(screen.getByText("Segment 2")).toBeInTheDocument();
    expect(screen.queryByText(/Moscow/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/18-24/i)).not.toBeInTheDocument();
  });

  it("language switcher still works", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <LanguageSwitcher />
        <AuctionIntelligencePanel
          cpm={5}
          metadata={metadataReady}
          predictDriftFlag
        />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Русский" }));
    await waitFor(() => {
      expect(
        screen.getByText("Нетипичный сценарий кампании"),
      ).toBeInTheDocument();
    });
  });
});
