import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { GateCard } from "@/client/components/GateCard";
import { QueryError } from "@/client/components/QueryState";
import { SkeletonPageContent } from "@/client/components/SkeletonPresets";
import { Button } from "@/client/components/ui/button";
import { useSamAccess } from "@/client/features/sam/useSamAccess";

/**
 * AI visibility setup researches the brand and suggests prompts through
 * OpenRouter, so a self-hosted install without a key would only fail after
 * the user starts research. Ask for the key first (hosted always has one).
 */
export function OpenRouterKeyGate({
  projectId,
  children,
}: {
  projectId: string;
  children: ReactNode;
}) {
  const access = useSamAccess(projectId);
  if (access.status === "ready") return children;
  if (access.status === "checking") return <SkeletonPageContent />;
  if (access.status === "error")
    return (
      <QueryError
        error={access.error}
        fallback="Não foi possível conferir a chave do OpenRouter."
        onRetry={access.onRetry}
        isRetrying={access.isRetrying}
      />
    );
  return (
    <div className="grid min-h-[calc(100dvh-8rem)] place-items-center">
      <GateCard
        className="max-w-2xl"
        icon={KeyRound}
        tone="warning"
        title="Adicione uma chave de API do OpenRouter"
        description={
          <>
            <p>
              A visibilidade em IA usa o OpenRouter para pesquisar sua marca e sugerir os prompts que valem acompanhar, sem você precisar escrever. Os resultados, o que o ChatGPT e outras IAs respondem, vêm da sua conta da DataForSEO.
            </p>
            <p>
              Crie uma chave no OpenRouter, defina como{" "}
              <code>OPENROUTER_API_KEY</code>, reinicie o dataSEO e confirme aqui. O{" "}
              <Link
                className="underline underline-offset-2 hover:text-foreground"
                to="/help/openrouter-api-key"
              >
                guia de configuração da chave do OpenRouter
              </Link>{" "}
              has the steps for each deployment.
            </p>
          </>
        }
        actions={
          <>
            <Button
              size="lg"
              pending={access.isRefetching}
              onClick={access.onRetry}
            >
              Confirmar chave de API
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false}
              render={
                <a
                  href="https://openrouter.ai/settings/keys"
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              Abrir chaves do OpenRouter
            </Button>
          </>
        }
      />
    </div>
  );
}
