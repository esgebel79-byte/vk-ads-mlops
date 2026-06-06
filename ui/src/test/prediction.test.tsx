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
import {
  parseUserIdsRaw,
  formValuesToCampaignRequest,
  buildCpmSweepRequest,
} from "@/features/prediction/schema";
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
    recommended_presets: [6, 12, 24, 48],
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

  it("builds campaign request with empty user_ids", () => {
    const request = formValuesToCampaignRequest({
      cpm: 15,
      forecast_duration_hours: 24,
      publishers: [101],
      audience_size: 5000,
    });
    expect(request).toEqual({
      cpm: 15,
      hour_start: 0,
      hour_end: 24,
      publishers: [101],
      audience_size: 5000,
      user_ids: [],
    });
  });

  it("builds sweep base_request with empty user_ids", () => {
    const request = buildCpmSweepRequest(
      {
        cpm: 10,
        forecast_duration_hours: 12,
        publishers: [204],
        audience_size: 2000,
      },
      { min: 0, max: 50, step: 5 },
    );
    expect(request.base_request.user_ids).toEqual([]);
    expect(request.base_request.publishers).toEqual([204]);
    expect(request.cpm_range).toEqual({ min: 0, max: 50, step: 5 });
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
        /Prediction service is unavailable because the model is not ready/,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Model file missing")).not.toBeInTheDocument();
  });
});

describe("CampaignForm", () => {
  beforeEach(() => {
    void i18n.changeLanguage("en");
  });

  it("renders campaign form fields in marketer-friendly order", () => {
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
    expect(screen.getByText("Forecast duration")).toBeInTheDocument();
    expect(screen.getByText("Target segment")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Calculate prediction" }),
    ).toBeInTheDocument();
  });

  it("renders CPM helper with 1,000 ad impressions", () => {
    renderWithProviders(
      <CampaignForm
        metadata={metadataFixture}
        isSubmitting={false}
        onSubmit={vi.fn()}
        onResetResults={vi.fn()}
      />,
    );
    expect(
      screen.getByText("Cost per 1,000 ad impressions."),
    ).toBeInTheDocument();
  });

  it("does not render hour 0 or User IDs on the form", () => {
    const { container } = renderWithProviders(
      <CampaignForm
        metadata={metadataFixture}
        isSubmitting={false}
        onSubmit={vi.fn()}
        onResetResults={vi.fn()}
      />,
    );
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/hour 0/i);
    expect(text).not.toMatch(/hour_start/);
    expect(text).not.toMatch(/User IDs/i);
    expect(text).not.toMatch(/user_ids/);
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

  it("forecast duration buttons are clickable and show active state", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CampaignForm
        metadata={metadataFixture}
        isSubmitting={false}
        onSubmit={vi.fn()}
        onResetResults={vi.fn()}
      />,
    );
    const button12h = screen.getByRole("button", { name: "12 h" });
    const button24h = screen.getByRole("button", { name: "24 h" });
    expect(button24h).toHaveAttribute("aria-pressed", "true");

    await user.click(button12h);
    await waitFor(() => {
      expect(button12h).toHaveAttribute("aria-pressed", "true");
      expect(button24h).toHaveAttribute("aria-pressed", "false");
    });
  });

  it("selecting forecast duration clears required validation error", async () => {
    const user = userEvent.setup();
    const metadataNoDefault24: MetadataResponse = {
      ...metadataFixture,
      time: {
        ...metadataFixture.time,
        recommended_presets: [6, 12],
      },
    };
    renderWithProviders(
      <CampaignForm
        metadata={metadataNoDefault24}
        isSubmitting={false}
        onSubmit={vi.fn()}
        onResetResults={vi.fn()}
      />,
    );
    const button6h = screen.getByRole("button", { name: "6 h" });
    await user.click(button6h);
    await waitFor(() => {
      expect(
        screen.queryByText("This field is required."),
      ).not.toBeInTheDocument();
    });
  });

  it("uses selected duration as hour_end in predict payload", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(
      <CampaignForm
        metadata={metadataFixture}
        isSubmitting={false}
        onSubmit={onSubmit}
        onResetResults={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: "12 h" }));
    await user.click(screen.getByText("Segment 1"));
    await user.click(
      screen.getByRole("button", { name: "Calculate prediction" }),
    );
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          hour_start: 0,
          hour_end: 12,
          user_ids: [],
          publishers: [101],
        }),
      );
    });
  });

  it("requires at least one target segment when segments are available", async () => {
    renderWithProviders(
      <CampaignForm
        metadata={metadataFixture}
        isSubmitting={false}
        onSubmit={vi.fn()}
        onResetResults={vi.fn()}
      />,
    );
    await waitFor(() => {
      expect(
        screen.getByRole("alert"),
      ).toHaveTextContent(/Select at least one target segment/);
    });
    expect(
      screen.getByRole("button", { name: "Calculate prediction" }),
    ).toBeDisabled();
  });

  it("displays marketer-friendly segment labels", () => {
    renderWithProviders(
      <CampaignForm
        metadata={metadataFixture}
        isSubmitting={false}
        onSubmit={vi.fn()}
        onResetResults={vi.fn()}
      />,
    );
    expect(screen.getByText("Segment 1")).toBeInTheDocument();
    expect(screen.getByText("Segment 2")).toBeInTheDocument();
    expect(screen.queryByText("Segment 101")).not.toBeInTheDocument();
    expect(screen.queryByText("publisher_universe")).not.toBeInTheDocument();
  });
});
