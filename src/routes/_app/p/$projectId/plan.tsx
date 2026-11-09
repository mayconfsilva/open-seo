import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ActionPlanPage } from "@/client/features/action-plan/ActionPlanPage";
import { projectsQueryOptions } from "@/client/features/projects/projectQueries";
import { pageHead } from "@/client/lib/pageHead";

export const Route = createFileRoute("/_app/p/$projectId/plan")({
  head: () => pageHead("Plano de ação"),
  component: ActionPlanRoute,
});

function ActionPlanRoute() {
  const { projectId } = Route.useParams();
  const projectsQuery = useQuery(projectsQueryOptions());
  const domain =
    projectsQuery.data?.find((project) => project.id === projectId)?.domain ??
    null;
  return (
    <ActionPlanPage key={projectId} projectId={projectId} domain={domain} />
  );
}
