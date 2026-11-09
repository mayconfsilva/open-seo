import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { saveSetupCompetitors } from "@/serverFunctions/project-setup";
import {
  MAX_SETUP_COMPETITORS,
  type SetupCompetitor,
} from "@/types/schemas/project-setup";
import {
  SetupCard,
  StepFooter,
  StepHeading,
  useInvalidateSetup,
  type SetupData,
} from "./setupShared";

type Row = { domain: string; name: string; kind: SetupCompetitor["kind"] };

const KINDS: Array<{ value: Row["kind"]; label: string }> = [
  { value: "commercial", label: "Comercial" },
  { value: "serp", label: "Nas buscas" },
];

const emptyRow = (): Row => ({ domain: "", name: "", kind: "commercial" });

/** Step 5 (board 5e): optional competitors, compared from the same check. */
export function StepCompetitors({
  setup,
  onBack,
  onNext,
}: {
  setup: SetupData;
  onBack: () => void;
  onNext: () => void;
}) {
  const invalidate = useInvalidateSetup(setup.project.id);
  const [rows, setRows] = useState<Row[]>(
    setup.competitors.length > 0
      ? setup.competitors.map((c) => ({
          domain: c.domain,
          name: c.name ?? "",
          kind: c.kind ?? "commercial",
        }))
      : [emptyRow()],
  );

  const save = useMutation({
    mutationFn: () =>
      saveSetupCompetitors({
        data: {
          projectId: setup.project.id,
          competitors: rows
            .filter((row) => row.domain.trim() !== "")
            .map((row) => ({
              domain: row.domain.trim(),
              name: row.name.trim() || null,
              kind: row.kind,
            })),
        },
      }),
    onSuccess: async () => {
      await invalidate();
      onNext();
    },
  });

  const update = (index: number, patch: Partial<Row>) =>
    setRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const filled = rows.filter((row) => row.domain.trim() !== "").length;

  return (
    <div className="flex flex-col gap-5">
      <StepHeading
        title="Com quem você disputa as buscas?"
        description="Opcional. As posições dos concorrentes vêm da mesma coleta das suas palavras, sem custo extra."
      />
      <SetupCard>
        <div className="flex flex-col gap-2">
          <div className="hidden grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto_auto] gap-2 text-[11.5px] font-semibold tracking-[.04em] text-muted-foreground uppercase sm:grid">
            <span>Domínio</span>
            <span>Nome (opcional)</span>
            <span>Tipo</span>
            <span className="w-7" />
          </div>
          {rows.map((row, index) => (
            <div
              key={index}
              className="grid gap-2 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto_auto] sm:items-center"
            >
              <Input
                aria-label="Domínio do concorrente"
                value={row.domain}
                placeholder="concorrente.com.br"
                onChange={(event) =>
                  update(index, { domain: event.target.value })
                }
              />
              <Input
                aria-label="Nome do concorrente"
                value={row.name}
                placeholder="Nome da empresa"
                onChange={(event) =>
                  update(index, { name: event.target.value })
                }
              />
              <div className="flex rounded-md border border-input p-0.5">
                {KINDS.map((kind) => (
                  <button
                    key={kind.value}
                    type="button"
                    aria-pressed={row.kind === kind.value}
                    className={
                      row.kind === kind.value
                        ? "rounded bg-accent px-2.5 py-1 text-[12.5px] font-medium text-primary"
                        : "rounded px-2.5 py-1 text-[12.5px] text-muted-foreground"
                    }
                    onClick={() => update(index, { kind: kind.value })}
                  >
                    {kind.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                aria-label="Remover concorrente"
                className="grid size-7 place-items-center text-muted-foreground hover:text-foreground"
                onClick={() =>
                  setRows(
                    rows.length === 1
                      ? [emptyRow()]
                      : rows.filter((_, i) => i !== index),
                  )
                }
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          className="self-start"
          disabled={rows.length >= MAX_SETUP_COMPETITORS}
          onClick={() => setRows([...rows, emptyRow()])}
        >
          <Plus data-icon="inline-start" />
          Adicionar concorrente
        </Button>
        <div className="grid gap-3 rounded-md bg-muted/50 px-3 py-2.5 text-[12.5px] text-muted-foreground sm:grid-cols-2">
          <p>
            <strong className="text-foreground">Comercial</strong>: quem disputa
            os mesmos clientes, mesmo que apareça pouco no Google.
          </p>
          <p>
            <strong className="text-foreground">Nas buscas</strong>: quem
            aparece nas suas palavras, mesmo sem vender o mesmo serviço
            (portais, blogs, marketplaces).
          </p>
        </div>
        <p className="text-[12px] text-muted-foreground">
          Até {MAX_SETUP_COMPETITORS} concorrentes. Seu próprio domínio e
          repetidos são ignorados.
        </p>
        {save.isError ? (
          <p className="text-sm text-destructive">
            {getStandardErrorMessage(save.error)}
          </p>
        ) : null}
      </SetupCard>
      <StepFooter
        onBack={onBack}
        onNext={() => save.mutate()}
        pending={save.isPending}
        hint={
          filled === 0
            ? "Sem concorrentes por enquanto. Dá para adicionar depois."
            : `${filled} concorrente(s)`
        }
        secondary={
          filled > 0 ? null : (
            <Button variant="ghost" onClick={onNext}>
              Pular, adicionar depois
            </Button>
          )
        }
        nextLabel="Salvar e continuar"
      />
    </div>
  );
}
