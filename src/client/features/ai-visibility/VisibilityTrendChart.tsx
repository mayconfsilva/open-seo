import { Line, LineChart } from "recharts";
import {
  ChartGrid,
  ChartXAxis,
  ChartYAxis,
} from "@/client/components/ChartAxes";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/client/components/ui/chart";
import type { AiTrend } from "@/shared/ai-visibility";

export const trendSeries = [
  { key: "mentionRate", label: "Menções à marca", color: "#2563eb" },
  { key: "citationRate", label: "Citações do seu site", color: "#e69f00" },
] as const;

const chartConfig: ChartConfig = Object.fromEntries(
  trendSeries.map((series) => [
    series.key,
    { label: series.label, color: series.color },
  ]),
);

const shortDate = (value: string | number) =>
  new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

/**
 * One point per calendar day, using the latest run in the selected period.
 * A run without eligible answers
 * leaves a gap, not a zero.
 */
export function VisibilityTrendChart({ trend }: { trend: AiTrend }) {
  const start = Date.parse(trend.current.start);
  const latestByDay = new Map<string, AiTrend["runs"][number]>();
  // Runs arrive oldest first; a later run replaces that day's earlier point.
  for (const run of trend.runs) {
    if (Date.parse(run.createdAt) <= start) continue;
    latestByDay.set(new Date(run.createdAt).toDateString(), run);
  }
  const data = [...latestByDay.values()].map((run) => ({
    time: Date.parse(run.createdAt),
    mentionRate: run.mentionRate,
    citationRate: run.citationRate,
    collected: `${run.coverage.answered} de ${run.coverage.expected} respostas coletadas`,
  }));
  return (
    <ChartContainer
      config={chartConfig}
      className="h-[220px]"
      aria-label="Taxa diária de menções à marca e citações do seu site"
    >
      <LineChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
        <ChartGrid />
        {/* Evenly spaced and centered, so a few runs fill the chart instead of
            crowding the end of the selected period. */}
        <ChartXAxis dataKey="time" scale="band" tickFormatter={shortDate} />
        <ChartYAxis
          domain={[0, 100]}
          ticks={[0, 25, 50, 75, 100]}
          tickFormatter={(value: number) => `${value}%`}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) => {
                const point = data.find((item) => item.time === Number(label));
                return point
                  ? `${new Date(point.time).toLocaleString("pt-BR")} · ${point.collected}`
                  : "";
              }}
              valueFormatter={(value) => `${String(value)}%`}
            />
          }
        />
        <Line
          type="monotone"
          dataKey="mentionRate"
          stroke="var(--color-mentionRate)"
          strokeWidth={2}
          dot={data.length < 40}
        />
        <Line
          type="monotone"
          dataKey="citationRate"
          stroke="var(--color-citationRate)"
          strokeWidth={2}
          dot={data.length < 40}
        />
      </LineChart>
    </ChartContainer>
  );
}
