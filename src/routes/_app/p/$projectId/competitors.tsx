import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CompetitorsPage } from "@/client/features/competitors/CompetitorsPage";
import { projectsQueryOptions } from "@/client/features/projects/projectQueries";
import { pageHead } from "@/client/lib/pageHead";

export const Route = createFileRoute("/_app/p/$projectId/competitors")({
  head: () => pageHead("Concorrentes"),
  component: CompetitorsRoute,
});

function CompetitorsRoute() {
  const { projectId } = Route.useParams();
  const projectsQuery = useQuery(projectsQueryOptions());
  const domain =
    projectsQuery.data?.find((project) => project.id === projectId)?.domain ??
    null;
  return (
    <CompetitorsPage key={projectId} projectId={projectId} domain={domain} />
  );
}
