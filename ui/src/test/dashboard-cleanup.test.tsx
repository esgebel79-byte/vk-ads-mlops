import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import { CampaignForm } from "@/features/prediction/components/CampaignForm";
import { WinProbabilityIndicator } from "@/features/prediction/components/WinProbabilityIndicator";
import { DashboardPage } from "@/pages/DashboardPage";
import { SystemStatusPage } from "@/pages/SystemStatusPage";
import { LanguageSwitcher } from "@/shared/components/LanguageSwitcher";
import * as systemApi from "@/features/system/api";
import type { MetadataResponse } from "@/features/system/types";

vi.mock("@/features/system/api", () => ({
  getHealth: vi.fn(),
  getMetadata: vi.fn(),
}));

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

const metadataNotReady: MetadataResponse = {
  model_ready: false,
  model_loaded: false,
  model_version: "deepsets_attention",
  publisher_universe: [],
  cpm: {
    min: 0,
    max: 100,
    step: 5,
    median_competitor_cpm: null,
    max_competitor_cpm: null,
    source: "unavailable",
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

const healthWithTechnicalArtifacts = {
  status: "ok" as const,
  model_loaded: false,
  model_ready: false,
  artifacts: {
    model_weights: {
      path: "/app/models/deepsets/model.pt",
      exists: false,
    },
    pub_universe: {
      path: "/app/data/processed/stage10/pub_universe.npy",
      exists: false,
    },
    user_feat: {
      path: "/app/data/processed/stage10/user_feat.npy",
      exists: false,
    },
  },
};

function renderWithProviders(ui: ReactElement, route = "/") {
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

describe("Dashboard UX cleanup (Phase 5.6)", () => {
  beforeEach(() => {
    void i18n.changeLanguage("en");
    vi.mocked(systemApi.getHealth).mockResolvedValue(healthWithTechnicalArtifacts);
    vi.mocked(systemApi.getMetadata).mockResolvedValue(metadataNotReady);
  });

  it("renders marketer-facing campaign panel title and description", async () => {
    renderWithProviders(<DashboardPage />);
    expect(
      await screen.findByRole("heading", { name: "Campaign prediction" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(
        /Set the campaign bid, audience size, duration, and target segment/,
      ).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("does not render raw artifact paths on the dashboard", async () => {
    const { container } = renderWithProviders(<DashboardPage />);
    await screen.findByText("Prediction model is not ready");
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/\/app\/models/);
    expect(text).not.toMatch(/pub_universe\.npy/);
    expect(text).not.toMatch(/user_feat\.npy/);
  });

  it("renders the model-not-ready banner only once", async () => {
    renderWithProviders(<DashboardPage />);
    await screen.findByText("Prediction model is not ready");
    expect(
      screen.getAllByText("Prediction model is not ready"),
    ).toHaveLength(1);
    expect(
      screen.queryByText("Predictions may be unavailable"),
    ).not.toBeInTheDocument();
  });

  it("disables Calculate prediction when model is not ready", async () => {
    renderWithProviders(<DashboardPage />);
    const submitButton = await screen.findByRole("button", {
      name: "Calculate prediction",
    });
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
    expect(
      await screen.findByText(
        /Prediction will be available after the prediction service is ready/,
      ),
    ).toBeInTheDocument();
  });

  it("disables Analyze CPM range when model is not ready", async () => {
    renderWithProviders(<DashboardPage />);
    const runButton = await screen.findByRole("button", {
      name: "Analyze CPM range",
    });
    await waitFor(() => {
      expect(runButton).toBeDisabled();
    });
    expect(
      await screen.findByText(
        /CPM sweep will be available when the prediction model is ready/,
      ),
    ).toBeInTheDocument();
  });

  it("shows target segment marketer-friendly label", () => {
    const metadataWithSegments: MetadataResponse = {
      ...metadataNotReady,
      model_ready: true,
      model_loaded: true,
      publisher_universe: [101, 204],
    };
    renderWithProviders(
      <CampaignForm
        metadata={metadataWithSegments}
        isSubmitting={false}
        onSubmit={vi.fn()}
        onResetResults={vi.fn()}
      />,
    );
    expect(screen.getByText("Target segment")).toBeInTheDocument();
    expect(screen.getByText("Segment 1")).toBeInTheDocument();
    expect(screen.queryByText("Publisher IDs")).not.toBeInTheDocument();
    expect(screen.queryByText(/hour 0/i)).not.toBeInTheDocument();
  });

  it("winning probability unknown state has no fake percentages", () => {
    renderWithProviders(
      <WinProbabilityIndicator
        cpm={15}
        cpmMeta={metadataNotReady.cpm}
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

  it("language switcher still works", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LanguageSwitcher />);
    await user.click(screen.getByRole("button", { name: "Русский" }));
    await waitFor(() => {
      expect(i18n.language).toMatch(/^ru/);
    });
  });
});

describe("Audience sampling UX (Phase 5.9)", () => {
  const metadataReady: MetadataResponse = {
    ...metadataNotReady,
    model_ready: true,
    model_loaded: true,
    publisher_universe: [101, 204],
    cpm: {
      min: 0,
      max: 100,
      step: 5,
      median_competitor_cpm: 10,
      max_competitor_cpm: 20,
      source: "artifact",
    },
  };

  beforeEach(() => {
    void i18n.changeLanguage("en");
    vi.mocked(systemApi.getHealth).mockResolvedValue({
      ...healthWithTechnicalArtifacts,
      model_ready: true,
      model_loaded: true,
    });
    vi.mocked(systemApi.getMetadata).mockResolvedValue(metadataReady);
  });

  it("does not render a visible User IDs input on the dashboard", async () => {
    renderWithProviders(<DashboardPage />);
    await screen.findByLabelText("Estimated audience size");
    expect(screen.queryByLabelText(/User IDs/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /User IDs/i })).not.toBeInTheDocument();
  });

  it("does not render User IDs (optional) text", async () => {
    renderWithProviders(<DashboardPage />);
    await screen.findByLabelText("Estimated audience size");
    expect(screen.queryByText("User IDs (optional)")).not.toBeInTheDocument();
    expect(screen.queryByText("Advanced targeting options")).not.toBeInTheDocument();
  });

  it("renders Estimated audience size label and sampling helper text", () => {
    renderWithProviders(
      <CampaignForm
        metadata={metadataReady}
        isSubmitting={false}
        onSubmit={vi.fn()}
        onResetResults={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Estimated audience size")).toBeInTheDocument();
    expect(
      screen.getByText(
        /The system uses a representative audience sample automatically/,
      ),
    ).toBeInTheDocument();
  });

  it("submits predict payload with user_ids empty array", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithProviders(
      <CampaignForm
        metadata={metadataReady}
        isSubmitting={false}
        onSubmit={onSubmit}
        onResetResults={vi.fn()}
      />,
    );
    await user.click(screen.getByText("Segment 1"));
    await user.click(
      screen.getByRole("button", { name: "Calculate prediction" }),
    );
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          user_ids: [],
          audience_size: 1000,
          publishers: [101],
        }),
      );
    });
  });

  it("shows target segment marketer-friendly label", () => {
    renderWithProviders(
      <CampaignForm
        metadata={metadataReady}
        isSubmitting={false}
        onSubmit={vi.fn()}
        onResetResults={vi.fn()}
      />,
    );
    expect(screen.getByText("Target segment")).toBeInTheDocument();
  });

  it("language switcher still works for audience sampling copy", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <LanguageSwitcher />
        <CampaignForm
          metadata={metadataReady}
          isSubmitting={false}
          onSubmit={vi.fn()}
          onResetResults={vi.fn()}
        />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Русский" }));
    await waitFor(() => {
      expect(
        screen.getByText(/репрезентативную выборку аудитории/),
      ).toBeInTheDocument();
    });
  });
});

describe("System status technical details", () => {
  beforeEach(() => {
    void i18n.changeLanguage("en");
    vi.mocked(systemApi.getHealth).mockResolvedValue(healthWithTechnicalArtifacts);
    vi.mocked(systemApi.getMetadata).mockResolvedValue(metadataNotReady);
  });

  it("renders artifact paths inside collapsed technical details", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SystemStatusPage />, "/system");
    expect(
      await screen.findByText("Technical details"),
    ).toBeInTheDocument();
    expect(screen.queryByText("/app/models/deepsets/model.pt")).not.toBeInTheDocument();

    const details = screen.getByText("Technical details").closest("details");
    expect(details).toBeTruthy();
    await user.click(screen.getByText("Show"));

    await waitFor(() => {
      expect(
        within(details as HTMLElement).getByText(
          "/app/models/deepsets/model.pt",
        ),
      ).toBeInTheDocument();
    });
  });
});
