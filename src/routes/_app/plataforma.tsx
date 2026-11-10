import { createFileRoute } from "@tanstack/react-router";
import { PlatformPage } from "@/client/features/platform/PlatformPage";
import { pageHead } from "@/client/lib/pageHead";

export const Route = createFileRoute("/_app/plataforma")({
  head: () => pageHead("Plataforma"),
  component: PlatformRoute,
});

function PlatformRoute() {
  return (
    <div className="h-full overflow-auto px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl">
        <PlatformPage />
      </div>
    </div>
  );
}
