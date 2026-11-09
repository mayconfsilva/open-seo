import { Link } from "@tanstack/react-router";
import { Bar, BarChart } from "recharts";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "cn";
import {
  ChartGrid,
  ChartXAxis,
  ChartYAxis,
} from "@/client/components/ChartAxes";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/client/components/ui/chart";

export interface Mover {
  keyword: string;
  from: number;
  to: number;
}

const cardClass = "rounded-lg border border-border bg-card";

export function SummaryCard({ text }: { text: string }) {
  return (
    <div className={cn(cardClass, "border-l-[3px] border-l-[#ff6446] p-4")}>
      <div className="font-mono text-[11px] font-medium tracking-[.08em] text-[#7c788c]">
        EM RESUMO
      </div>
      <p className="mt-1.5 text-[15px] leading-relaxed text-pretty">{text}</p>
    </div>
  );
}

export function KpiCard({
  label,
  value,
  delta,
  note,
}: {
  label: string;
  value: number | string;
  delta?: number;
  note: string;
}) {
  return (
    <div className={cn(cardClass, "flex flex-col gap-1 p-4")}>
      <span className="text-[12.5px] text-muted-foreground">{label}</span>
      <span className="flex items-baseline gap-2">
        <span className="text-[28px] font-semibold tabular-nums leading-none">
          {value}
        </span>
        {delta ? (
          <span
            className={cn(
              "inline-flex items-center text-[12.5px] font-medium tabular-nums",
              delta > 0 ? "text-[#14613f]" : "text-[#9a2c21]",
            )}
          >
            {delta > 0 ? (
              <ArrowUp className="size-3" />
            ) : (
              <ArrowDown className="size-3" />
            )}
            {Math.abs(delta)}
          </span>
        ) : null}
      </span>
      <span className="text-[11.5px] text-[#7c788c]">{note}</span>
    </div>
  );
}

const BANDS: ChartConfig = {
  top3: { label: "1 a 3", color: "#2e2150" },
  top4to10: { label: "4 a 10", color: "#8e83b5" },
  top11to20: { label: "11 a 20", color: "#c9c2e3" },
  notRanking: { label: "Não encontrado", color: "#e3e2ea" },
  notChecked: { label: "Coleta falhou", color: "#f2b8ad" },
};

export function PositionBandsChart({
  points,
}: {
  points: Array<{
    checkedAt: string;
    top3: number;
    top4to10: number;
    top11to20: number;
    notRanking: number;
    notChecked: number;
  }>;
}) {
  const data = points.map((point) => ({
    ...point,
    label: new Date(point.checkedAt).toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "short",
    }),
  }));
  return (
    <div className={cn(cardClass, "p-4")}>
      <h2 className="text-[15px] font-semibold">
        Em que faixa de posição estão as palavras
      </h2>
      <p className="mt-0.5 text-[12.5px] text-muted-foreground">
        Uma coluna por coleta · últimos 90 dias · «Coleta falhou» nunca conta
        como «Não encontrado»
      </p>
      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Nenhuma coleta nos últimos 90 dias.
        </p>
      ) : (
        <ChartContainer config={BANDS} className="mt-3 h-64 w-full">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0 }}>
            <ChartGrid />
            <ChartXAxis dataKey="label" minTickGap={8} />
            <ChartYAxis allowDecimals={false} width={32} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            {Object.keys(BANDS).map((key, index, keys) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="bands"
                fill={`var(--color-${key})`}
                radius={index === keys.length - 1 ? [3, 3, 0, 0] : 0}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ChartContainer>
      )}
    </div>
  );
}

export function MoversCard({
  projectId,
  up,
  down,
}: {
  projectId: string;
  up: Mover[];
  down: Mover[];
}) {
  return (
    <div className={cn(cardClass, "h-full p-4")}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold">
          Palavras com maiores mudanças
        </h2>
        <Link
          to="/p/$projectId/rank-tracking"
          params={{ projectId }}
          className="text-[12.5px] text-primary underline underline-offset-2"
        >
          Ver todas as palavras
        </Link>
      </div>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <MoverList title="SUBIRAM" movers={up} tone="up" />
        <MoverList title="CAÍRAM" movers={down} tone="down" />
      </div>
      <p className="mt-3 text-[11.5px] text-[#7c788c]">
        Comparação com 90 dias atrás. Posições: 1 = melhor. «Subiu» significa
        que a palavra ficou mais perto do 1º lugar.
      </p>
    </div>
  );
}

function MoverList({
  title,
  movers,
  tone,
}: {
  title: string;
  movers: Mover[];
  tone: "up" | "down";
}) {
  return (
    <div>
      <div className="mb-1 font-mono text-[11px] font-medium tracking-[.08em] text-[#7c788c]">
        {title}
      </div>
      {movers.length === 0 ? (
        <p className="py-2 text-[13px] text-muted-foreground">
          Nenhuma palavra.
        </p>
      ) : (
        <ul className="divide-y divide-[#eeedf3]">
          {movers.map((mover) => (
            <li
              key={mover.keyword}
              className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-1.5 text-[13px]"
            >
              <span className="truncate">{mover.keyword}</span>
              <span className="tabular-nums text-muted-foreground">
                {mover.from} →{" "}
                <strong className="text-foreground">{mover.to}</strong>
              </span>
              <span
                className={cn(
                  "min-w-9 rounded px-1.5 text-center text-[11.5px] font-semibold tabular-nums",
                  tone === "up"
                    ? "bg-[#e5f3ec] text-[#14613f]"
                    : "bg-[#fbe8e5] text-[#9a2c21]",
                )}
              >
                {tone === "up" ? "+" : "−"}
                {Math.abs(mover.from - mover.to)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CompetitorsTop10({
  projectId,
  you,
  competitors,
  base,
}: {
  projectId: string;
  you: { name: string; value: number };
  competitors: Array<{ name: string; value: number | null }>;
  base: number;
}) {
  const entries = [
    { ...you, isYou: true },
    ...competitors.map((c) => ({ ...c, isYou: false })),
  ];
  const max = Math.max(base, 1);
  return (
    <div className={cn(cardClass, "h-full p-4")}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold">Concorrentes no top 10</h2>
        <Link
          to="/p/$projectId/rank-tracking"
          params={{ projectId }}
          className="text-[12.5px] text-primary underline underline-offset-2"
        >
          Comparar
        </Link>
      </div>
      <p className="mt-0.5 text-[12.5px] text-muted-foreground">
        Palavras de cada domínio entre as 10 primeiras · última coleta
      </p>
      <ul className="mt-3 flex flex-col gap-2.5">
        {entries.map((entry) => (
          <li key={entry.name} className="flex flex-col gap-1">
            <span className="flex justify-between gap-2 text-[12.5px]">
              <span
                className={cn(
                  "truncate font-mono",
                  entry.isYou && "font-semibold text-primary",
                )}
              >
                {entry.name}
                {entry.isYou ? " (você)" : ""}
              </span>
              <span className="tabular-nums">{entry.value ?? "…"}</span>
            </span>
            <span className="h-1.5 overflow-hidden rounded-full bg-[#f0eff4]">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${((entry.value ?? 0) / max) * 100}%`,
                  background: entry.isYou ? "#2e2150" : "#8e83b5",
                }}
              />
            </span>
          </li>
        ))}
      </ul>
      {competitors.length === 0 ? (
        <p className="mt-3 text-[12.5px] text-muted-foreground">
          Nenhum concorrente acompanhado. Adicione o domínio de um concorrente
          no acompanhamento de posições para comparar.
        </p>
      ) : null}
    </div>
  );
}
