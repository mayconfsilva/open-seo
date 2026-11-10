import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import {
  getGoogleAccountRemovalImpact,
  removeGoogleAccount,
} from "@/serverFunctions/googleAccounts";

export function GoogleAccountRemovalDialog({
  provider,
  accountId,
  label,
  onClose,
  onRemoved,
}: {
  provider: "gsc" | "ga4";
  accountId: string;
  label: string;
  onClose: () => void;
  onRemoved: () => void;
}) {
  const queryClient = useQueryClient();
  const impact = useQuery({
    queryKey: ["googleAccountRemovalImpact", provider, accountId],
    queryFn: () =>
      getGoogleAccountRemovalImpact({ data: { provider, accountId } }),
    staleTime: 0,
    gcTime: 0,
  });
  const removal = useMutation({
    meta: { errorToast: false },
    mutationFn: () =>
      removeGoogleAccount({ data: { provider, accountId, confirmed: true } }),
    onSuccess: async () => {
      const keys =
        provider === "gsc"
          ? [
              "gscConnection",
              "gscSites",
              "gscGrantStatus",
              "searchPerformance",
              "searchPerformanceTable",
              "dashboardGscReport",
              "dashboardActivation",
            ]
          : [
              "ga4Connection",
              "ga4Properties",
              "dashboardGa4Report",
              "dashboardActivation",
            ];
      await Promise.all(
        keys.map((key) => queryClient.invalidateQueries({ queryKey: [key] })),
      );
      toast.success("Conta Google removida");
      onRemoved();
    },
  });
  const name = provider === "gsc" ? "Search Console" : "Google Analytics";
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !removal.isPending) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Remover a conta Google?</DialogTitle>
          <DialogDescription>
            Isso remove a conexão do {name} desta conta no dataSEO. Você pode
            reconectar quando quiser.
          </DialogDescription>
        </DialogHeader>
        <p className="break-all text-sm font-medium">{label}</p>
        {impact.isPending ? (
          <p role="status" className="text-sm text-muted-foreground">
            Conferindo os projetos conectados…
          </p>
        ) : impact.isError ? (
          <div role="alert" className="text-sm">
            <p className="text-destructive">
              Não foi possível conferir os projetos conectados.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void impact.refetch()}
            >
              Tentar de novo
            </Button>
          </div>
        ) : impact.data.projectCount > 0 ? (
          <p className="text-sm font-medium">
            Isso também desconecta o {name} de {impact.data.projectCount}{" "}
            projeto{impact.data.projectCount === 1 ? "" : "s"}.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum projeto será afetado.
          </p>
        )}
        {removal.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {getStandardErrorMessage(removal.error)}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            disabled={removal.isPending}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={
              !impact.isSuccess || impact.isFetching || removal.isPending
            }
            onClick={() => removal.mutate()}
          >
            {removal.isPending ? "Removendo…" : "Remover conta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
