import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, ExternalLink, Info } from "lucide-react";
import { AppBanner } from "@/client/layout/AppBanner";
import { dataforseoHelpLinkOptions } from "@/client/navigation/items";
import { isEveryAppClientAuthMode } from "@/lib/auth-mode";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";

function SeoApiStatusBanners({
  shouldShowSeoApiWarning,
  seoApiKeyStatusError,
}: {
  shouldShowSeoApiWarning: boolean;
  seoApiKeyStatusError: boolean;
}) {
  const icon = <AlertTriangle className="size-4 shrink-0" />;
  const helpLink = (
    <Link
      {...dataforseoHelpLinkOptions}
      className="font-medium text-primary underline-offset-4 hover:underline"
    >
      página de ajuda
    </Link>
  );
  return (
    <>
      {shouldShowSeoApiWarning ? (
        <AppBanner variant="warning" icon={icon}>
          {isEveryAppClientAuthMode() ? (
            <>
              DataForSEO isn&apos;t set up on your Every App gateway yet. An
              owner or admin sets it with{" "}
              <code>pnpm everyapp secret set DATAFORSEO_API_KEY</code>. Steps on
              the {helpLink}.
            </>
          ) : (
            <>
              Configuração pendente: adicione sua chave da DataForSEO para usar
              os dados de SEO. Veja os passos na {helpLink}.
            </>
          )}
        </AppBanner>
      ) : null}

      {seoApiKeyStatusError ? (
        <AppBanner variant="info" icon={icon}>
          Não conseguimos verificar sua configuração da DataForSEO. Se algo não
          funcionar, confira os passos na {helpLink}.
        </AppBanner>
      ) : null}
    </>
  );
}

const DOCKER_MOVE_URL =
  "https://github.com/every-app/open-seo/blob/main/docs/SELF_HOSTING_DOCKER.md#move-from-the-old-docker-image";
const DOCKER_MOVE_DISMISSED_KEY = "openseo:docker-move-dismissed";

// The old single-container Docker image builds the app at startup with this
// flag set (deploy/docker/Dockerfile), so only its users see the notice.
function LegacyDockerBanner() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DOCKER_MOVE_DISMISSED_KEY) === "1",
  );
  if (import.meta.env.VITE_OPENSEO_LEGACY_DOCKER !== "true" || dismissed) {
    return null;
  }
  return (
    <AppBanner variant="info" icon={<Info className="size-4 shrink-0" />}>
      A new OpenSEO Docker setup starts in seconds and supports accounts. This
      image keeps getting updates, and moving keeps your data.{" "}
      <a
        href={DOCKER_MOVE_URL}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-primary underline-offset-4 hover:underline"
      >
        How to move
      </a>{" "}
      ·{" "}
      <button
        type="button"
        className="font-medium text-primary underline-offset-4 hover:underline"
        onClick={() => {
          localStorage.setItem(DOCKER_MOVE_DISMISSED_KEY, "1");
          setDismissed(true);
        }}
      >
        Dispensar
      </button>
    </AppBanner>
  );
}

function MissingSeoSetupModal({ onClose }: { onClose: () => void }) {
  const everyApp = isEveryAppClientAuthMode();
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="flex-row items-start gap-3 text-left">
          <div className="rounded-full bg-warning/20 p-2 text-warning">
            <AlertTriangle className="size-5" />
          </div>
          <div className="space-y-2">
            <DialogTitle>
              {everyApp
                ? "DataForSEO isn't set up yet"
                : "Falta um passo de configuração"}
            </DialogTitle>
            <DialogDescription>
              {everyApp ? (
                <>
                  Keyword, domain, backlink and rank data comes from DataForSEO
                  through your Every App gateway. An owner or admin sets it once
                  for every app with{" "}
                  <code>pnpm everyapp secret set DATAFORSEO_API_KEY</code>; the
                  setup guide has the steps.
                </>
              ) : (
                "Adicione sua chave da DataForSEO para começar a usar o dataSEO."
              )}
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Agora não
          </Button>
          <Button
            nativeButton={false}
            render={<Link {...dataforseoHelpLinkOptions} onClick={onClose} />}
          >
            Abrir guia de configuração
            <ExternalLink className="size-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { LegacyDockerBanner, MissingSeoSetupModal, SeoApiStatusBanners };
