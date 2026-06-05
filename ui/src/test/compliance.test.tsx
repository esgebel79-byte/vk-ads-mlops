import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import { CampaignForm } from "@/features/prediction/components/CampaignForm";
import { WinProbabilityIndicator } from "@/features/prediction/components/WinProbabilityIndicator";
import { AuctionIntelligencePanel } from "@/features/prediction/components/AuctionIntelligencePanel";
import { resolveCpmInputStep } from "@/features/prediction/schema";
import { DashboardPage } from "@/pages/DashboardPage";
import { LanguageSwitcher } from "@/shared/components/LanguageSwitcher";
import type { MetadataResponse } from "@/features/system/types";

vi.mock("@/features/prediction/api", () => ({
  predictCampaign: vi.fn(),
  predictCpmSweep: vi.fn(),
  HttpError: class HttpError extends Error {
    status: number;
    body: unknown;
    constructor(message: string, status: number, body: unknown) {
      super(message);
      this.status = status;
      this.body = body;
    }
  },
  isModelUnavailableError: vi.fn(() => false),
  isValidationError: vi.fn(() => false),
  getPredictionErrorDetail: vi.fn(),
}));

vi.mock("@/features/history/api", () => ({
  getRecentPredictions: vi.fn(() => Promise.resolve([])),
}));

vi.mock("@/features/system/api", () => ({
  getHealth: vi.fn(() =>
    Promise.resolve({
      status: "ok",
      model_loaded: true,
      model_ready: true,
      artifacts: {},
    }),
  ),
  getMetadata: vi.fn(() => Promise.resolve(metadataWithPublishers)),
}));

const metadataWithPublishers: MetadataResponse = {
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

const metadataEmptyPublishers: MetadataResponse = {
  ...metadataWithPublishers,
  publisher_universe: [],
};

const metadataNoThresholds: MetadataResponse = {
  ...metadataWithPublishers,
  cpm: {
    min: 0,
    max: 100,
    step: 5,
    median_competitor_cpm: null,
    max_competitor_cpm: null,
    source: "unavailable",
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

describe("requirements compliance", () => {
  beforeEach(() => {
    void i18n.changeLanguage("en");
  });

  describe("resolveCpmInputStep", () => {
    it("uses metadata step when 0.1 or 1", () => {
      expect(resolveCpmInputStep(0.1)).toBe(0.1);
      expect(resolveCpmInputStep(1)).toBe(1);
    });

    it("falls back to 0.1 for other step values", () => {
      expect(resolveCpmInputStep(0.5)).toBe(0.1);
      expect(resolveCpmInputStep(5)).toBe(0.1);
      expect(resolveCpmInputStep(undefined)).toBe(0.1);
    });
  });

  describe("target segment selector", () => {
    it("displays marketer-friendly label", () => {
      renderWithProviders(
        <CampaignForm
          metadata={metadataWithPublishers}
          isSubmitting={false}
          onSubmit={vi.fn()}
          onResetResults={vi.fn()}
        />,
      );
      expect(screen.getByText("Target segment")).toBeInTheDocument();
      expect(screen.getByText("Segment 101")).toBeInTheDocument();
      expect(screen.getByText("Segment 204")).toBeInTheDocument();
    });

    it("requires segment selection when publisher_universe is available", async () => {
      renderWithProviders(
        <CampaignForm
          metadata={metadataWithPublishers}
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

    it("does not block form when publisher_universe is empty but shows warning", async () => {
      renderWithProviders(
        <CampaignForm
          metadata={metadataEmptyPublishers}
          isSubmitting={false}
          onSubmit={vi.fn()}
          onResetResults={vi.fn()}
        />,
      );
      expect(
        screen.getByText(
          /Publisher segment metadata is not available, so this request will be sent without segment filtering/,
        ),
      ).toBeInTheDocument();
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Calculate prediction" }),
        ).not.toBeDisabled();
      });
      expect(
        screen.queryByText(
          "Select at least one target segment / publisher group.",
        ),
      ).not.toBeInTheDocument();
    });
  });

  describe("main CPM input step", () => {
    it("uses 0.1 step when metadata step is not 0.1 or 1", () => {
      renderWithProviders(
        <CampaignForm
          metadata={metadataWithPublishers}
          isSubmitting={false}
          onSubmit={vi.fn()}
          onResetResults={vi.fn()}
        />,
      );
      const cpmInput = screen.getByLabelText("CPM bid");
      expect(cpmInput).toHaveAttribute("step", "0.1");
    });
  });

  describe("WinProbabilityIndicator", () => {
    it("shows guaranteed win when CPM exceeds max competitor CPM", () => {
      renderWithProviders(
        <WinProbabilityIndicator
          cpm={25}
          cpmMeta={metadataWithPublishers.cpm}
        />,
      );
      expect(screen.getByText("100%")).toBeInTheDocument();
      expect(screen.getByText("Likely guaranteed win")).toBeInTheDocument();
    });

    it("shows edge warning at 50% when CPM approximately equals max competitor CPM", () => {
      renderWithProviders(
        <WinProbabilityIndicator
          cpm={20}
          cpmMeta={metadataWithPublishers.cpm}
        />,
      );
      expect(screen.getByText("50%")).toBeInTheDocument();
      expect(screen.getByText("Edge rate (~50%)")).toBeInTheDocument();
    });

    it("shows unknown state when thresholds are unavailable", () => {
      renderWithProviders(
        <WinProbabilityIndicator
          cpm={15}
          cpmMeta={metadataNoThresholds.cpm}
        />,
      );
      expect(screen.getByText("Unknown")).toBeInTheDocument();
      expect(
        screen.getByText(
          /Winning probability is unavailable because competitor CPM thresholds are not provided/,
        ),
      ).toBeInTheDocument();
      expect(screen.queryByText("100%")).not.toBeInTheDocument();
      expect(screen.queryByText("50%")).not.toBeInTheDocument();
    });
  });

  describe("session burnout", () => {
    it("renders session burnout note in auction intelligence", () => {
      renderWithProviders(
        <AuctionIntelligencePanel
          cpm={15}
          metadata={metadataWithPublishers}
        />,
      );
      expect(
        screen.getByText("Session frequency limitation"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/4-hour inactivity window expires/),
      ).toBeInTheDocument();
    });
  });

  describe("dashboard and language switcher", () => {
    it("renders dashboard", async () => {
      renderWithProviders(<DashboardPage />);
      expect(
        await screen.findByRole("heading", { name: "Campaign reach forecasting" }),
      ).toBeInTheDocument();
      expect(
        await screen.findByText("Winning probability"),
      ).toBeInTheDocument();
    });

    it("language switcher still works", async () => {
      const user = userEvent.setup();
      renderWithProviders(<LanguageSwitcher />);
      await user.click(screen.getByRole("button", { name: "Русский" }));
      await waitFor(() => {
        expect(i18n.language).toMatch(/^ru/);
      });
    });
  });
});
