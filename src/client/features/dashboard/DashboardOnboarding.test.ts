import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import type { DashboardActivation } from "@/server/features/dashboard/services/DashboardService";
import { DashboardOnboarding } from "./DashboardOnboarding";
import { setupSteps } from "./dashboardSteps";

vi.mock("@/serverFunctions/dashboard", () => ({
  setDashboardStepDismissed: vi.fn(),
}));
vi.mock("./DashboardSetupAction", () => ({
  DashboardSetupAction: () => createElement("div", null, "Connection setup"),
}));

const fresh: DashboardActivation = {
  domain: null,
  ga4: { connected: false, propertyDisplayName: null, cardDismissedAt: null },
  gsc: { connected: false, siteUrl: null },
  mcp: { authorizedAt: null, firstToolCallAt: null, cardDismissed: false },
  competitorResearchedAt: null,
  keywordsResearchedAt: null,
  hasAudit: false,
  hasMultipleProjects: false,
  hasTeammate: false,
  dismissedSteps: [],
};

function renderChecklist(activation = fresh) {
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(DashboardOnboarding, {
        projectId: "project-a",
        activation,
      }),
    ),
  );
}

describe("dashboard onboarding visibility", () => {
  it("keeps skipped steps restorable while other steps remain", () => {
    const markup = renderChecklist({
      ...fresh,
      dismissedSteps: ["competitor"],
    });
    expect(markup).toContain("1 para depois");
  });

  it("hides once no step is left to do, even with skipped steps", () => {
    expect(
      renderChecklist({
        ...fresh,
        dismissedSteps: setupSteps.map((step) => step.id),
      }),
    ).toBe("");
  });

  it("renders nothing once every step is complete", () => {
    expect(
      renderChecklist({
        ...fresh,
        competitorResearchedAt: "2026-09-28",
        keywordsResearchedAt: "2026-09-28",
        hasAudit: true,
        mcp: { ...fresh.mcp, authorizedAt: "2026-09-28" },
        hasTeammate: true,
        hasMultipleProjects: true,
      }),
    ).toBe("");
  });
});
