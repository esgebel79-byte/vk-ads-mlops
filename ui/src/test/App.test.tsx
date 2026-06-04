import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import i18n from "@/i18n";
import { App } from "@/app/App";
import { DashboardPage } from "@/pages/DashboardPage";
import { EmptyState } from "@/shared/components/EmptyState";
import { ErrorState } from "@/shared/components/ErrorState";
import { LanguageSwitcher } from "@/shared/components/LanguageSwitcher";

vi.mock("@/features/system/api", () => ({
  getHealth: vi.fn(() =>
    Promise.resolve({
      status: "ok",
      model_loaded: false,
      model_ready: false,
      artifacts: {},
    }),
  ),
  getMetadata: vi.fn(() =>
    Promise.resolve({
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
    }),
  ),
}));

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

describe("App", () => {
  beforeEach(() => {
    void i18n.changeLanguage("en");
  });

  it("renders without crashing", async () => {
    render(<App />);
    expect(
      await screen.findByRole("heading", {
        name: "Reach intelligence at a glance",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("VK Ads Reach Intelligence").length).toBeGreaterThan(
      0,
    );
  });

  it("renders language switcher", () => {
    renderWithProviders(<LanguageSwitcher />);
    expect(screen.getByRole("button", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Русский" })).toBeInTheDocument();
  });

  it("shows dashboard hero title", async () => {
    renderWithProviders(<DashboardPage />);
    expect(
      await screen.findByRole("heading", { name: "Reach intelligence at a glance" }),
    ).toBeInTheDocument();
  });

  it("renders error state with retry", () => {
    const onRetry = vi.fn();
    renderWithProviders(
      <ErrorState title="Custom error" onRetry={onRetry} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Custom error");
    screen.getByRole("button", { name: "Try again" }).click();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("renders empty state", () => {
    renderWithProviders(
      <EmptyState title="Nothing here" description="No records yet" />,
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("No records yet")).toBeInTheDocument();
  });
});
