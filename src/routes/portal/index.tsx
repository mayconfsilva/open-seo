import { createFileRoute } from "@tanstack/react-router";
import { PortalHome } from "@/client/features/portal/PortalHome";

export const Route = createFileRoute("/portal/")({
  component: PortalHome,
});
