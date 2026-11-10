import type { CsvValue } from "@/client/lib/csv";
import type { CategoryTab, LighthouseIssue } from "./types";

const ISSUE_HEADERS = [
  "Categoria",
  "Gravidade",
  "Nota",
  "Título",
  "Valor exibido",
  "Descrição",
  "Impacto (ms)",
  "Impacto (bytes)",
  "Itens afetados",
];

function issuesToRows(issues: LighthouseIssue[]): CsvValue[][] {
  return issues.map((issue) => [
    issue.category,
    issue.severity,
    issue.score ?? "",
    issue.title,
    issue.displayValue ?? "",
    issue.description ?? "",
    issue.impactMs ?? "",
    issue.impactBytes ?? "",
    issue.items.length,
  ]);
}

export function issuesToTable(issues: LighthouseIssue[]) {
  return { headers: ISSUE_HEADERS, rows: issuesToRows(issues) };
}

export function categoryLabel(category: CategoryTab) {
  if (category === "best-practices") return "Boas práticas";
  if (category === "all") return "Todos";
  return `${category.charAt(0).toUpperCase()}${category.slice(1)}`;
}
