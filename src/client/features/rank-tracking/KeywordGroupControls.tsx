import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderInput, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { TextDialog } from "./KeywordTextDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import {
  createKeywordGroup,
  deleteKeywordGroup,
  listKeywordGroups,
  renameKeywordGroup,
  setTrackingKeywordsGroup,
  setTrackingKeywordsTargetUrl,
} from "@/serverFunctions/rank-keyword-groups";
import type { RankTrackingRow } from "@/types/schemas/rank-tracking";

export interface KeywordGroup {
  id: string;
  name: string;
}

/** "all", "none" (keywords without a group) or a group id. */
export type GroupFilter = "all" | "none" | (string & {});

export function keywordGroupsQueryKey(projectId: string, configId: string) {
  return ["rankKeywordGroups", projectId, configId];
}

export function useKeywordGroups(projectId: string, configId: string) {
  return useQuery({
    queryKey: keywordGroupsQueryKey(projectId, configId),
    queryFn: () => listKeywordGroups({ data: { projectId, configId } }),
  });
}

function useInvalidateKeywords(projectId: string, configId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({
      queryKey: keywordGroupsQueryKey(projectId, configId),
    });
    void queryClient.invalidateQueries({
      queryKey: ["rankTrackingResults", projectId, configId],
    });
  };
}

export function GroupFilterBar({
  groups,
  rows,
  value,
  onChange,
  onManage,
}: {
  groups: KeywordGroup[];
  rows: RankTrackingRow[];
  value: GroupFilter;
  onChange: (value: GroupFilter) => void;
  onManage: () => void;
}) {
  if (groups.length === 0) return null;
  const count = (id: string | null) =>
    rows.filter((row) => row.groupId === id).length;
  const chips: Array<{ value: GroupFilter; label: string; count: number }> = [
    { value: "all", label: "Todos", count: rows.length },
    ...groups.map((group) => ({
      value: group.id,
      label: group.name,
      count: count(group.id),
    })),
    { value: "none", label: "Sem grupo", count: count(null) },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5 px-1 pb-3">
      {chips.map((chip) => (
        <button
          key={chip.value}
          type="button"
          onClick={() => onChange(chip.value)}
          aria-pressed={value === chip.value}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[12.5px]",
            value === chip.value
              ? "border-primary bg-accent font-semibold text-primary"
              : "border-border bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          {chip.label}
          <span className="tabular-nums text-[11px] opacity-70">
            {chip.count}
          </span>
        </button>
      ))}
      <Button variant="ghost" size="sm" onClick={onManage}>
        <Pencil data-icon="inline-start" />
        Gerenciar grupos
      </Button>
    </div>
  );
}

export function filterRowsByGroup(
  rows: RankTrackingRow[],
  filter: GroupFilter,
) {
  if (filter === "all") return rows;
  if (filter === "none") return rows.filter((row) => row.groupId === null);
  return rows.filter((row) => row.groupId === filter);
}

export function KeywordBulkOrganizeActions({
  projectId,
  configId,
  groups,
  keywordIds,
  onDone,
}: {
  projectId: string;
  configId: string;
  groups: KeywordGroup[];
  keywordIds: string[];
  onDone: () => void;
}) {
  const invalidate = useInvalidateKeywords(projectId, configId);
  const [dialog, setDialog] = useState<"newGroup" | "target" | null>(null);
  const moveMutation = useMutation({
    mutationFn: (groupId: string | null) =>
      setTrackingKeywordsGroup({
        data: { projectId, configId, keywordIds, groupId },
      }),
    onSuccess: (result) => {
      invalidate();
      onDone();
      toast.success(`${result.updated} palavra(s) movida(s)`);
    },
    onError: (error) => toast.error(getStandardErrorMessage(error)),
  });
  const createAndMove = useMutation({
    mutationFn: async (name: string) => {
      const group = await createKeywordGroup({
        data: { projectId, configId, name },
      });
      return setTrackingKeywordsGroup({
        data: { projectId, configId, keywordIds, groupId: group.id },
      });
    },
    onSuccess: (result) => {
      setDialog(null);
      invalidate();
      onDone();
      toast.success(`${result.updated} palavra(s) movida(s) para o novo grupo`);
    },
    onError: (error) => toast.error(getStandardErrorMessage(error)),
  });
  const targetMutation = useMutation({
    mutationFn: (targetUrl: string) =>
      setTrackingKeywordsTargetUrl({
        data: { projectId, configId, keywordIds, targetUrl },
      }),
    onSuccess: (result) => {
      setDialog(null);
      invalidate();
      onDone();
      toast.success(`Página alvo definida para ${result.updated} palavra(s)`);
    },
    onError: (error) => toast.error(getStandardErrorMessage(error)),
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              pending={moveMutation.isPending}
            />
          }
        >
          <FolderInput data-icon="inline-start" />
          Mover para grupo
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" className="w-52">
          {groups.map((group) => (
            <DropdownMenuItem
              key={group.id}
              onClick={() => moveMutation.mutate(group.id)}
            >
              {group.name}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onClick={() => moveMutation.mutate(null)}>
            Sem grupo
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDialog("newGroup")}>
            <Plus className="size-4" />
            Novo grupo…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="ghost" size="sm" onClick={() => setDialog("target")}>
        <Link2 data-icon="inline-start" />
        Página alvo
      </Button>

      {dialog === "newGroup" ? (
        <TextDialog
          title="Novo grupo"
          description={`As ${keywordIds.length} palavras selecionadas vão para este grupo.`}
          label="Nome do grupo"
          placeholder="Ex.: Instalação"
          submitLabel="Criar e mover"
          pending={createAndMove.isPending}
          onSubmit={(name) => createAndMove.mutate(name)}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog === "target" ? (
        <TextDialog
          title="Página alvo"
          description="A página do seu site que deveria aparecer no Google para estas palavras. Deixe vazio para remover."
          label="Caminho ou endereço"
          placeholder="/servicos/instalacao"
          submitLabel="Salvar"
          allowEmpty
          pending={targetMutation.isPending}
          onSubmit={(url) => targetMutation.mutate(url)}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </>
  );
}

export function ManageGroupsDialog({
  projectId,
  configId,
  groups,
  onClose,
}: {
  projectId: string;
  configId: string;
  groups: KeywordGroup[];
  onClose: () => void;
}) {
  const invalidate = useInvalidateKeywords(projectId, configId);
  const [names, setNames] = useState<Record<string, string>>({});
  const renameMutation = useMutation({
    mutationFn: (vars: { groupId: string; name: string }) =>
      renameKeywordGroup({ data: { projectId, configId, ...vars } }),
    onSuccess: () => {
      invalidate();
      toast.success("Grupo renomeado");
    },
    onError: (error) => toast.error(getStandardErrorMessage(error)),
  });
  const deleteMutation = useMutation({
    mutationFn: (groupId: string) =>
      deleteKeywordGroup({ data: { projectId, configId, groupId } }),
    onSuccess: () => {
      invalidate();
      toast.success("Grupo excluído. As palavras ficaram sem grupo.");
    },
    onError: (error) => toast.error(getStandardErrorMessage(error)),
  });
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar grupos</DialogTitle>
          <DialogDescription>
            Excluir um grupo não remove as palavras: elas ficam sem grupo.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2">
          {groups.map((group) => {
            const name = names[group.id] ?? group.name;
            const changed = name.trim() !== "" && name.trim() !== group.name;
            return (
              <li key={group.id} className="flex items-center gap-2">
                <Input
                  value={name}
                  aria-label={`Nome do grupo ${group.name}`}
                  onChange={(event) =>
                    setNames((prev) => ({
                      ...prev,
                      [group.id]: event.target.value,
                    }))
                  }
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!changed}
                  onClick={() =>
                    renameMutation.mutate({
                      groupId: group.id,
                      name: name.trim(),
                    })
                  }
                >
                  Salvar
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Excluir grupo ${group.name}`}
                  onClick={() => deleteMutation.mutate(group.id)}
                >
                  <Trash2 />
                </Button>
              </li>
            );
          })}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
