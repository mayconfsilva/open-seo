import { useState } from "react";
import { toast } from "sonner";
import { ChartLine } from "lucide-react";
import { CardShell } from "@/client/components/CardShell";
import { EmptyState } from "@/client/components/EmptyState";
import { Button } from "@/client/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GoogleConnectionCard } from "@/client/features/integrations/GoogleConnectionCard";
import { GoogleAnalyticsLogo } from "@/client/features/integrations/GoogleProductLogos";
import { googlePickerPending } from "@/client/features/integrations/useGooglePickerResume";
import { captureClientEvent } from "@/client/lib/posthog";
import { dismissDashboardGa4Card } from "@/serverFunctions/dashboard";

export function Ga4ConnectCard({
  projectId,
  connected,
}: {
  projectId: string;
  connected: boolean;
}) {
  const queryClient = useQueryClient();
  // Back from Google's consent screen, the person already said yes: open
  // the property picker instead of asking again.
  const [usesGa4, setUsesGa4] = useState(() =>
    googlePickerPending("ga4", projectId),
  );
  const dismissMutation = useMutation({
    mutationFn: () => dismissDashboardGa4Card({ data: { projectId } }),
    onSuccess: () => {
      toast.success("Usa outra ferramenta de análise?", {
        description:
          "Conecte o servidor MCP dela ao seu agente de IA para usar seus dados de análise.",
        duration: 10000,
      });
      void queryClient.invalidateQueries({
        queryKey: ["dashboardActivation", projectId],
      });
    },
  });

  if (!connected && !usesGa4)
    return (
      <CardShell
        title="Google Analytics"
        icon={<GoogleAnalyticsLogo className="size-5" />}
      >
        <EmptyState
          variant="plain"
          icon={ChartLine}
          title="Do you use Google Analytics 4?"
          description="Traga seu tráfego orgânico e conversões para o painel."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => setUsesGa4(true)}>
                Sim, conectar o GA4
              </Button>
              <Button
                variant="outline"
                disabled={dismissMutation.isPending}
                onClick={() => {
                  captureClientEvent("dashboard:ga4_dismiss");
                  dismissMutation.mutate();
                }}
              >
                Não
              </Button>
            </div>
          }
        />
      </CardShell>
    );
  return (
    <GoogleConnectionCard
      provider="ga4"
      projectId={projectId}
      prominent
      onDismiss={
        connected
          ? undefined
          : () => {
              captureClientEvent("dashboard:ga4_dismiss");
              dismissMutation.mutate();
            }
      }
      dismissing={dismissMutation.isPending}
    />
  );
}
