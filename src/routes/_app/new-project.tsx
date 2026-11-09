import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SetupWizard } from "@/client/features/project-setup/SetupWizard";
import { pageHead } from "@/client/lib/pageHead";

const searchSchema = z.object({
  project: z.string().optional(),
  step: z
    .union([z.coerce.number().int().min(1).max(6), z.literal("first-check")])
    .catch(1)
    .default(1),
});

export const Route = createFileRoute("/_app/new-project")({
  head: () => pageHead("Novo projeto"),
  validateSearch: searchSchema,
  component: NewProjectRoute,
});

function NewProjectRoute() {
  const { project, step } = Route.useSearch();
  // Without a draft only step 1 exists.
  const current = project ? step : 1;
  return (
    <SetupWizard
      key={`${project ?? "new"}:${current}`}
      projectId={project}
      step={current}
    />
  );
}
