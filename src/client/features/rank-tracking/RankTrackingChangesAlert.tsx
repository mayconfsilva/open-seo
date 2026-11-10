import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/client/components/ui/alert";

export function RankTrackingChangesAlert() {
  return (
    <Alert variant="info">
      <Info />
      <AlertDescription className="text-foreground">
        <p>
          <span className="font-medium">
            O acompanhamento agora lê cada palavra várias vezes.
          </span>{" "}
          Desde setembro, o Google vem entregando resultados incompletos a todas
          as ferramentas de posição.{" "}
          <a
            href="https://openseo.so/blogs/state-of-rank-tracking-november-2026"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-4"
          >
            Veja o que mudou
          </a>
        </p>
      </AlertDescription>
    </Alert>
  );
}
