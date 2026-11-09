import { Link, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { PageLoading } from "@/client/components/Spinner";
import { Button } from "@/client/components/ui/button";
import { useHostedAuthRouteGuard } from "@/client/features/auth/useHostedAuthRouteGuard";
import { OrganizationRow } from "@/client/features/team/OrganizationRow";
import { organizationContextQueryOptions } from "@/client/features/team/organizationQueries";
import { signOutAndRedirect } from "@/lib/auth-client";
import { usesBetterAuthClient } from "@/lib/auth-mode";
import { isClientRole } from "@/lib/org-permissions";

/**
 * The client portal (dataSEO access phase): a read-only view of the projects
 * an agency shared with a client. Agency staff can open it to see what their
 * clients see.
 */
export function PortalLayout() {
  const authGate = useHostedAuthRouteGuard();
  const ready = authGate.canRenderAuthenticatedContent;
  const orgQuery = useQuery({
    ...organizationContextQueryOptions(),
    enabled: ready,
  });
  if (!ready) return <PageLoading />;
  const isClient = orgQuery.data ? isClientRole(orgQuery.data.role) : true;

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-2 md:px-6">
          <Link to="/portal" className="shrink-0">
            <img
              src="/logo-dataseo.png"
              alt="dataSEO"
              className="block h-auto w-[120px]"
            />
          </Link>
          <div className="min-w-56 overflow-hidden rounded-[10px] border border-border">
            <OrganizationRow ready={ready} />
          </div>
          <span className="flex-1" />
          {isClient ? null : (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link to="/projects" />}
            >
              Voltar para a carteira
            </Button>
          )}
          {usesBetterAuthClient() ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOutAndRedirect()}
            >
              <LogOut data-icon="inline-start" />
              Sair
            </Button>
          ) : null}
        </div>
      </header>
      {isClient ? null : (
        <p className="bg-accent px-4 py-2 text-center text-[12.5px] text-primary">
          Você está vendo o portal como o cliente vê: só leitura, sem custos.
        </p>
      )}
      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <Outlet />
      </main>
    </div>
  );
}
