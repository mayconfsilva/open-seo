import { createServerFn } from "@tanstack/react-start";
import { requireOrgPermission } from "@/server/auth/org-gate";
import { ProjectSetupService } from "@/server/features/project-setup/ProjectSetupService";
import {
  requireAuthenticatedContext,
  requireProjectContext,
} from "@/serverFunctions/middleware";
import {
  addSetupKeywordsSchema,
  confirmSetupSchema,
  createSetupDraftSchema,
  getSetupSchema,
  saveSetupBusinessSchema,
  saveSetupCompetitorsSchema,
  saveSetupMarketSchema,
} from "@/types/schemas/project-setup";

// The dataSEO new-project wizard. Every step saves to the draft project, and
// nothing is collected or billed until confirmSetup.

export const createSetupDraft = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(createSetupDraftSchema)
  .handler(async ({ data, context }) => {
    requireOrgPermission(context, { project: ["create"] });
    return ProjectSetupService.createDraft(context.organizationId, data);
  });

export const getSetup = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(getSetupSchema)
  .handler(async ({ context }) =>
    ProjectSetupService.getSetup(context.project),
  );

export const saveSetupBusiness = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(saveSetupBusinessSchema)
  .handler(async ({ data, context }) => {
    const { projectId: _projectId, ...business } = data;
    await ProjectSetupService.saveBusiness(context.project, business);
  });

export const saveSetupMarket = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(saveSetupMarketSchema)
  .handler(async ({ data, context }) => {
    const { projectId: _projectId, ...market } = data;
    return ProjectSetupService.saveMarket(context.project, market);
  });

export const addSetupKeywords = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(addSetupKeywordsSchema)
  .handler(async ({ data, context }) =>
    ProjectSetupService.addKeywords(context.project, data),
  );

export const saveSetupCompetitors = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(saveSetupCompetitorsSchema)
  .handler(async ({ data, context }) =>
    ProjectSetupService.saveCompetitors(context.project, data.competitors),
  );

export const confirmSetup = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(confirmSetupSchema)
  .handler(async ({ data, context }) =>
    ProjectSetupService.confirm(context.project, context, data),
  );
