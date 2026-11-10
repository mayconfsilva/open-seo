import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/client/components/ui/alert";
import { Button } from "@/client/components/ui/button";

/**
 * Shown when Shopify rate limited an unrendered crawl that carried a crawler
 * signature. Shopify's edge can still throttle Cloudflare Workers then, and a
 * rendered audit reads throttled pages from outside Cloudflare.
 */
export function ShopifyRateLimitAlert({
  projectId,
  startUrl,
}: {
  projectId: string;
  startUrl: string;
}) {
  return (
    <Alert variant="warning">
      <ShieldAlert />
      <AlertTitle>Houve um erro com o seu domínio Shopify.</AlertTitle>
      <AlertDescription>
        O Shopify está limitando as requisições de forma geral, então este
        relatório está incompleto. Para completar a auditoria, inicie uma nova
        com Renderizar JavaScript ativado.
      </AlertDescription>
      <div className="col-start-2 mt-2">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={
            <Link
              to="/p/$projectId/audit"
              params={{ projectId }}
              search={{ url: startUrl }}
            />
          }
        >
          Iniciar nova auditoria
        </Button>
      </div>
    </Alert>
  );
}
