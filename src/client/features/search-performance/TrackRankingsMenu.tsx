import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { LineChart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/client/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { LOCATIONS } from "@/client/features/keywords/locations";
import { captureClientEvent } from "@/client/lib/posthog";
import {
  addTrackingKeywords,
  getRankTrackingConfigs,
} from "@/serverFunctions/rank-tracking";
import { MAX_TRACKED_KEYWORD_LENGTH } from "@/shared/rank-tracking";

/** Bulk action: add the selected queries to one of the project's rank trackers. */
export function TrackRankingsMenu({
  projectId,
  queries,
  onAdded,
}: {
  projectId: string;
  queries: string[];
  onAdded: () => void;
}) {
  const queryClient = useQueryClient();
  const configsQuery = useQuery({
    queryKey: ["rankTrackingConfigs", projectId],
    queryFn: () => getRankTrackingConfigs({ data: { projectId } }),
  });
  const configs = configsQuery.data ?? [];

  const add = useMutation({
    mutationFn: (configId: string) =>
      addTrackingKeywords({
        data: {
          projectId,
          configId,
          // One overlong query would fail the whole request.
          keywords: queries.filter(
            (query) => query.length <= MAX_TRACKED_KEYWORD_LENGTH,
          ),
        },
      }),
    onSuccess: (result, configId) => {
      captureClientEvent("rank_tracking:keywords_add", {
        source_feature: "search_performance",
        keyword_count: result.added,
      });
      for (const key of [
        "rankTrackingResults",
        "rankTrackingCostEstimate",
        "rankTrackingLatestRun",
      ]) {
        void queryClient.invalidateQueries({
          queryKey: [key, projectId, configId],
        });
      }
      void queryClient.invalidateQueries({
        queryKey: ["rankTrackingConfigSummaries", projectId],
      });
      const skipped = queries.length - result.added;
      toast.success(
        `${result.added} palavra${result.added === 1 ? "" : "s"} nova${result.added === 1 ? "" : "s"} no monitoramento${skipped > 0 ? ` (${skipped} já monitorada${skipped === 1 ? "" : "s"}, longa${skipped === 1 ? "" : "s"} demais ou acima do limite)` : ""}`,
      );
      if (result.checkScheduledSoon) {
        toast.info(
          "A coleta agendada para a próxima hora já inclui estas palavras",
        );
      }
      onAdded();
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="sm" pending={add.isPending} />}
      >
        {add.isPending ? null : <LineChart data-icon="inline-start" />}
        Monitorar posições
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="w-72">
        {configs.length === 0 ? (
          <DropdownMenuItem
            disabled={configsQuery.isLoading}
            render={
              <Link to="/p/$projectId/rank-tracking" params={{ projectId }} />
            }
          >
            {configsQuery.isLoading
              ? "Carregando monitoramentos…"
              : "Configure o monitoramento de posições antes"}
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuLabel>Adicionar ao monitoramento</DropdownMenuLabel>
            {configs.map((config) => (
              <DropdownMenuItem
                key={config.id}
                disabled={add.isPending}
                onClick={() => add.mutate(config.id)}
              >
                <span className="truncate">
                  {config.domain} ·{" "}
                  {config.locationName ??
                    LOCATIONS[config.locationCode] ??
                    config.locationCode}
                </span>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
