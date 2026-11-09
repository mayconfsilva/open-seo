import { createFileRoute } from "@tanstack/react-router";
import { PortalLayout } from "@/client/features/portal/PortalLayout";
import { pageHead } from "@/client/lib/pageHead";

export const Route = createFileRoute("/portal")({
  // Client data loads with react-query after the session check.
  ssr: false,
  head: () => pageHead("Portal do cliente"),
  component: PortalLayout,
});
