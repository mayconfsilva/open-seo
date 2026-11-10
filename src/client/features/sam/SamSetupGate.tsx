import { Link } from "@tanstack/react-router";
import { ShieldAlert, Wrench } from "lucide-react";
import { GateCard } from "@/client/components/GateCard";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";
import { isEveryAppClientAuthMode } from "@/lib/auth-mode";

export function SamSetupGate({
  errorMessage,
  isRefetching,
  onRetry,
}: {
  errorMessage: string | null;
  isRefetching: boolean;
  onRetry: () => void;
}) {
  return (
    <GateCard
      icon={Wrench}
      tone="warning"
      title="Ativar recursos de IA"
      description={
        <>
          {isEveryAppClientAuthMode() ? (
            <p>
              SAM, OpenSEO&apos;s in-app AI agent, uses OpenRouter through your
              Every App gateway. An admin creates a key on OpenRouter and sets
              it on the gateway with{" "}
              <code>pnpm everyapp secret set OPENROUTER_API_KEY</code>, then
              confirm here.
            </p>
          ) : (
            <p>
              O SAM, agente de IA do dataSEO, precisa de uma chave de API do
              OpenRouter. Crie uma chave no OpenRouter, defina como a variável{" "}
              <code>OPENROUTER_API_KEY</code> , reinicie o dataSEO e confirme
              aqui.
            </p>
          )}
          <p className="text-xs">
            O passo a passo para cada instalação está no{" "}
            <Link
              className="underline underline-offset-2 hover:text-foreground"
              to="/help/openrouter-api-key"
            >
              guia de configuração da chave do OpenRouter
            </Link>
            .
          </p>
        </>
      }
      actions={
        <>
          <Button size="lg" pending={isRefetching} onClick={onRetry}>
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
    >
      {errorMessage ? (
        <Alert variant="warning">
          <ShieldAlert />
          <AlertDescription className="text-foreground">
            {errorMessage}
          </AlertDescription>
        </Alert>
      ) : null}
    </GateCard>
  );
}
