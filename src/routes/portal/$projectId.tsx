import { createFileRoute } from "@tanstack/react-router";
import { PortalProjectPage } from "@/client/features/portal/PortalProjectPage";

export const Route = createFileRoute("/portal/$projectId")({
  component: PortalProjectRoute,
});

function PortalProjectRoute() {
  const { projectId } = Route.useParams();
  return <PortalProjectPage key={projectId} projectId={projectId} />;
}
