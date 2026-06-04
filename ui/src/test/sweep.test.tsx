import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import { AuctionIntelligencePanel } from "@/features/prediction/components/AuctionIntelligencePanel";
import { CpmSweepControls } from "@/features/prediction/components/CpmSweepControls";
import {
  buildAuctionInsights,
  resolvePrimaryAuctionInsight,
} from "@/features/prediction/lib/auctionIntelligence";
import { findBestSweepPoint } from "@/features/prediction/lib/sweep";
import { createCpmSweepControlsSchema } from "@/features/prediction/schema";
import type { CpmSweepPoint } from "@/features/prediction/types";
import type { MetadataResponse } from "@/features/system/types";

const metadataFixture: MetadataResponse = {
  model_ready: true,
  model_loaded: true,
  model_version: "deepsets_attention",
  publisher_universe: [101, 204],
  cpm: {
    min: 0,
    max: 100,
    step: 5,
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
    max_sweep_points: 5,
    max_recent_predictions: 100,
  },
};

const metadataNoThresholds: MetadataResponse = {
  ...metadataFixture,
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

describe("sweep validation", () => {
  const schema = createCpmSweepControlsSchema({ maxSweepPoints: 5 });

  it("rejects max below min", () => {
    const result = schema.safeParse({ min: 50, max: 10, step: 5 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message === "sweep_max_below_min")).toBe(
        true,
      );
    }
  });

  it("rejects too many sweep points", () => {
    const result = schema.safeParse({ min: 0, max: 100, step: 1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.message === "sweep_too_many_points"),
      ).toBe(true);
    }
  });
});

describe("findBestSweepPoint", () => {
  it("selects lowest CPM when predicted reach ties", () => {
    const points: CpmSweepPoint[] = [
      {
        cpm: 20,
        at_least_one: 0.5,
        at_least_two: 0.2,
        at_least_three: 0.1,
        predicted_reach: 5000,
        drift_flag: false,
      },
      {
        cpm: 10,
        at_least_one: 0.5,
        at_least_two: 0.2,
        at_least_three: 0.1,
        predicted_reach: 5000,
        drift_flag: false,
      },
    ];
    expect(findBestSweepPoint(points)).toEqual({ cpm: 10, predicted_reach: 5000 });
  });
});

describe("AuctionIntelligencePanel", () => {
  beforeEach(() => {
    void i18n.changeLanguage("en");
  });

  it("shows threshold unavailable message when thresholds are null", () => {
    renderWithProviders(
      <AuctionIntelligencePanel cpm={12} metadata={metadataNoThresholds} />,
    );
    expect(
      screen.getByText("Auction intelligence limited"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Competitor CPM statistics are not available/),
    ).toBeInTheDocument();
  });

  it("shows guaranteed win when CPM exceeds max competitor CPM", () => {
    renderWithProviders(
      <AuctionIntelligencePanel cpm={25} metadata={metadataFixture} />,
    );
    expect(
      screen.getByText("Likely guaranteed auction win"),
    ).toBeInTheDocument();
  });

  it("shows edge-rate warning when CPM approximately equals max competitor CPM", () => {
    renderWithProviders(
      <AuctionIntelligencePanel cpm={20} metadata={metadataFixture} />,
    );
    expect(screen.getByText("CPM at competitor ceiling")).toBeInTheDocument();
  });

  it("renders session burnout note", () => {
    renderWithProviders(
      <AuctionIntelligencePanel cpm={15} metadata={metadataFixture} />,
    );
    expect(screen.getByText("Session burnout")).toBeInTheDocument();
    expect(
      screen.getByText(/4-hour silence window/),
    ).toBeInTheDocument();
  });
});

describe("auction intelligence helpers", () => {
  it("resolves guaranteed win for high CPM", () => {
    const insight = resolvePrimaryAuctionInsight(25, metadataFixture.cpm);
    expect(insight.kind).toBe("guaranteed_win");
    expect(insight.status).toBe("success");
  });

  it("includes session burnout in built insights", () => {
    const insights = buildAuctionInsights({
      cpm: 15,
      cpmMeta: metadataFixture.cpm,
      sessionSilenceHours: 4,
    });
    expect(insights.some((i) => i.kind === "session_burnout")).toBe(true);
  });
});

describe("CpmSweepControls", () => {
  beforeEach(() => {
    void i18n.changeLanguage("en");
  });

  it("renders sweep control fields", () => {
    renderWithProviders(
      <CpmSweepControls
        metadata={metadataFixture}
        isRunning={false}
        onRun={vi.fn()}
        onReset={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Minimum CPM")).toBeInTheDocument();
    expect(screen.getByLabelText("Maximum CPM")).toBeInTheDocument();
    expect(screen.getByLabelText("CPM step")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Run CPM sweep" }),
    ).toBeInTheDocument();
  });

  it("shows validation error for invalid sweep range", async () => {
    renderWithProviders(
      <CpmSweepControls
        metadata={metadataFixture}
        isRunning={false}
        onRun={vi.fn()}
        onReset={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Maximum CPM"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Minimum CPM"), {
      target: { value: "50" },
    });
    fireEvent.blur(screen.getByLabelText("Minimum CPM"));
    await waitFor(() => {
      expect(
        screen.getByText(
          "Maximum CPM must be greater than or equal to minimum CPM.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("shows validation error for too many sweep points", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CpmSweepControls
        metadata={metadataFixture}
        isRunning={false}
        onRun={vi.fn()}
        onReset={vi.fn()}
      />,
    );
    const stepInput = screen.getByLabelText("CPM step");
    await user.clear(stepInput);
    await user.type(stepInput, "1");
    await waitFor(() => {
      expect(screen.getAllByText(/too many points/i).length).toBeGreaterThan(0);
    });
  });
});
