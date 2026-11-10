import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Unplug } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { SectionHeader } from "@/client/components/PageHeader";
import { QueryState } from "@/client/components/QueryState";
import { RowActionsMenu } from "@/client/components/RowActionsMenu";
import { DropdownMenuItem } from "@/client/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { useOrganizations } from "@/client/features/settings/useOrganizations";
import { captureClientEvent } from "@/client/lib/posthog";
import {
  listMcpConnections,
  revokeMcpConnection,
} from "@/serverFunctions/mcp-connections";

export function McpConnectionsSettings() {
  const queryClient = useQueryClient();
  const [disconnecting, setDisconnecting] = useState<{
    id: string;
    clientName: string;
  } | null>(null);
  const { hasMultiple: showOrganization, organizationName } =
    useOrganizations();

  const connectionsQuery = useQuery({
    queryKey: ["mcpConnections"],
    queryFn: () => listMcpConnections(),
  });

  const disconnectMutation = useMutation({
    mutationFn: (grantId: string) => revokeMcpConnection({ data: { grantId } }),
    onSuccess: () => {
      captureClientEvent("mcp:connection_revoked");
      toast.success("Agente desconectado");
      setDisconnecting(null);
      void queryClient.invalidateQueries({ queryKey: ["mcpConnections"] });
    },
  });

  return (
    <section className="space-y-3">
      <SectionHeader title="Agentes conectados" />
      <p className="text-sm">Clientes de IA conectados ao dataSEO por OAuth.</p>

      <QueryState
        query={connectionsQuery}
        errorFallback="Não foi possível carregar os agentes conectados."
      >
        {(connections) =>
          connections.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum agente conectado ainda.
            </p>
          ) : (
            <TableCard>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    {showOrganization ? (
                      <TableHead>Organização</TableHead>
                    ) : null}
                    <TableHead>Conectado</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {connections.map((connection) => (
                    <TableRow key={connection.id}>
                      <TableCell className="max-w-[220px] truncate font-medium">
                        {connection.clientName}
                      </TableCell>
                      {showOrganization ? (
                        <TableCell className="text-xs text-muted-foreground">
                          {organizationName(connection.organizationId) ?? "—"}
                        </TableCell>
                      ) : null}
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(connection.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <RowActionsMenu
                          label={`Ações de ${connection.clientName}`}
                        >
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() =>
                              setDisconnecting({
                                id: connection.id,
                                clientName: connection.clientName,
                              })
                            }
                          >
                            <Unplug />
                            Desconectar
                          </DropdownMenuItem>
                        </RowActionsMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableCard>
          )
        }
      </QueryState>

      {disconnecting ? (
        <ConfirmDialog
          title={`Desconectar “${disconnecting.clientName}”?`}
          confirmLabel="Desconectar"
          destructive
          pending={disconnectMutation.isPending}
          onClose={() => setDisconnecting(null)}
          onConfirm={() => disconnectMutation.mutate(disconnecting.id)}
        >
          Ele terá que entrar no dataSEO de novo.
        </ConfirmDialog>
      ) : null}
    </section>
  );
}
