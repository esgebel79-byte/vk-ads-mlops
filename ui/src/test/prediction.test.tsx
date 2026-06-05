import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import { CampaignForm } from "@/features/prediction/components/CampaignForm";
import { PredictionResultCards } from "@/features/prediction/components/PredictionResultCards";
import { PredictionUnavailableState } from "@/features/prediction/components/PredictionUnavailableState";
import { parseUserIdsRaw } from "@/features/prediction/schema";
import type { MetadataResponse } from "@/features/system/types";

const metadataFixture: MetadataResponse = {
  model_ready: true,
  model_loaded: true,
  model_version: "deepsets_attention",
  publisher_universe: [101, 204],
  cpm: {
    min: 0,
    max: 100,
    step: 0.5,
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

describe("prediction utilities", () => {
  it("parses comma-separated user IDs", () => {
    expect(parseUserIdsRaw("1, 2, 3")).toEqual([1, 2, 3]);
    expect(parseUserIdsRaw("")).toEqual([]);
  });

  it("rejects non-integer user IDs", () => {
    expect(() => parseUserIdsRaw("1, 2.5")).toThrow();
  });
});

describe("PredictionResultCards", () => {
  it("renders percentages with one decimal", () => {
    renderWithProviders(
      <PredictionResultCards
        response={{
          at_least_one: 0.81,
          at_least_two: 0.63,
          at_least_three: 0.44,
          model_version: "deepsets_attention",
          drift_flag: false,
          prediction_id: "test-id",
        }}
      />,
    );
    expect(screen.getByText("81.0%")).toBeInTheDocument();
    expect(screen.getByText("63.0%")).toBeInTheDocument();
    expect(screen.getByText("44.0%")).toBeInTheDocument();
  });
});

describe("PredictionUnavailableState", () => {
  it("renders marketer-facing unavailable messaging without technical detail", () => {
    renderWithProviders(<PredictionUnavailableState />);
    expect(
      screen.getByText("Prediction service unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Prediction service is unavailable because model artifacts are missing or not loaded/,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Model file missing")).not.toBeInTheDocument();
  });
});

describe("CampaignForm", () => {
  beforeEach(() => {
    void i18n.changeLanguage("en");
  });

  it("renders campaign form fields", () => {
    renderWithProviders(
      <CampaignForm
        metadata={metadataFixture}
        isSubmitting={false}
        onSubmit={vi.fn()}
        onResetResults={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("CPM bid")).toBeInTheDocument();
    expect(screen.getByLabelText("Estimated audience size")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Calculate prediction" }),
    ).toBeInTheDocument();
  });

  it("shows validation for negative CPM", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CampaignForm
        metadata={metadataFixture}
        isSubmitting={false}
        onSubmit={vi.fn()}
        onResetResults={vi.fn()}
      />,
    );
    const cpmInput = screen.getByLabelText("CPM bid");
    await user.clear(cpmInput);
    await user.type(cpmInput, "-5");
    await waitFor(() => {
      expect(screen.getByText("CPM cannot be negative.")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "Calculate prediction" }),
    ).toBeDisabled();
  });
});
