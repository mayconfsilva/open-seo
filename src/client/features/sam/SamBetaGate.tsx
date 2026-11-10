import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { GateCard } from "@/client/components/GateCard";
import { Button } from "@/client/components/ui/button";

/**
 * Shown on the chat route until the user opts into Sam. Sam is the OpenSEO
 * MCP plus skills wrapped in an in-app chat; the agents people already use
 * run that same toolset with a more mature harness, so the primary action
 * points there and Sam is the explicit fallback.
 */
export function SamBetaGate({ onContinue }: { onContinue: () => void }) {
  return (
    <GateCard
      icon={Sparkles}
      title="O SAM está em beta"
      description={
        <>
          <p>
            O SAM é o MCP e as skills do dataSEO numa janela de conversa. O agente que você já usa, como Claude Code, ChatGPT, Grok Bot ou Hermes, roda as mesmas ferramentas com muito mais capacidade. Recomendamos usar o dataSEO por lá.
          </p>
          <p>Você ainda pode usar o SAM, mas ele é recente e tem limitações.</p>
        </>
      }
      actions={
        <>
          <Button size="lg" nativeButton={false} render={<Link to="/ai" />}>
            Configure seu agente
          </Button>
          <Button size="lg" variant="ghost" onClick={onContinue}>
            Usar o SAM mesmo assim
          </Button>
        </>
      }
    />
  );
}
