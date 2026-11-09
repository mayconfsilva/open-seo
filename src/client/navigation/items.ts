import {
  Bookmark,
  Bot,
  Brain,
  ChartLine,
  ClipboardCheck,
  FileText,
  Globe,
  LayoutDashboard,
  Link2,
  MapPin,
  MessageSquare,
  Search,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";
import { linkOptions } from "@tanstack/react-router";
import { GoogleGlyphMuted } from "@/client/features/gsc/GoogleGlyph";

const projectNavItems = [
  {
    to: "/p/$projectId" as const,
    label: "Resumo",
    icon: LayoutDashboard,
    // Without exact matching, the index path is a prefix of every project
    // route and the Dashboard item would render active everywhere.
    activeOptions: { exact: true, includeSearch: false },
  },
  {
    to: "/p/$projectId/keywords" as const,
    label: "Pesquisa de palavras",
    icon: Search,
  },
  {
    to: "/p/$projectId/saved" as const,
    label: "Palavras salvas",
    icon: Bookmark,
  },
  {
    to: "/p/$projectId/rank-tracking" as const,
    label: "Palavras-chave",
    icon: TrendingUp,
  },
  {
    to: "/p/$projectId/local-seo" as const,
    label: "SEO local",
    icon: MapPin,
  },
  {
    to: "/p/$projectId/search-performance" as const,
    label: "Busca no Google",
    icon: GoogleGlyphMuted,
  },
  {
    to: "/p/$projectId/domain" as const,
    label: "Concorrentes",
    icon: Globe,
  },
  {
    to: "/p/$projectId/backlinks" as const,
    label: "Backlinks",
    icon: Link2,
  },
  {
    to: "/p/$projectId/audit" as const,
    label: "Auditoria",
    icon: ClipboardCheck,
  },
  {
    to: "/p/$projectId/ai-visibility" as const,
    label: "Visibilidade em IA",
    icon: ChartLine,
    activeOptions: { exact: true, includeSearch: false },
  },
  {
    to: "/p/$projectId/ai-visibility/research" as const,
    label: "Pesquisa de prompts",
    icon: Search,
  },
  {
    to: "/p/$projectId/prompt-explorer" as const,
    label: "Explorador de prompts",
    icon: MessageSquare,
  },
  {
    to: "/p/$projectId/reports" as const,
    label: "Relatórios",
    icon: FileText,
  },
  {
    to: "/p/$projectId/context" as const,
    label: "Contexto do projeto",
    icon: Brain,
  },
  {
    to: "/p/$projectId/settings" as const,
    label: "Configurações do projeto",
    icon: SlidersHorizontal,
  },
] as const;

// Project-independent. Rendered inside the project "AI Tools" group when a project
// is selected, and on its own (connectNavGroup) when none is.
const aiNavItem = linkOptions({
  to: "/ai" as const,
  label: "Conectar agente de IA",
  icon: Bot,
});

// Shown only when no project is selected; with a project, Agent setup lives in
// the "AI Tools" group below.
export const connectNavGroup = {
  label: "Ferramentas de IA",
  items: [aiNavItem],
};

function getProjectNavItems(projectId: string) {
  return linkOptions(
    projectNavItems.map((item) => ({
      ...item,
      params: { projectId },
      search: {},
    })),
  );
}

// dataSEO grouping (visual direction v2): the project's own data first, then
// analysis, execution and setup. Tools the boards leave for a later phase stay
// reachable under "Outras ferramentas".
export function getProjectNavGroups(projectId: string) {
  const all = getProjectNavItems(projectId);
  const byPath = (path: (typeof projectNavItems)[number]["to"]) =>
    all.find((i) => i.to === path)!;

  return [
    {
      label: "",
      items: [byPath("/p/$projectId")],
    },
    {
      label: "Desempenho",
      items: [byPath("/p/$projectId/search-performance")],
    },
    {
      label: "Análise",
      items: [
        byPath("/p/$projectId/rank-tracking"),
        byPath("/p/$projectId/keywords"),
        byPath("/p/$projectId/saved"),
        byPath("/p/$projectId/domain"),
        byPath("/p/$projectId/audit"),
        byPath("/p/$projectId/backlinks"),
      ],
    },
    {
      label: "Execução",
      items: [byPath("/p/$projectId/reports")],
    },
    {
      label: "Outras ferramentas",
      items: [
        byPath("/p/$projectId/local-seo"),
        byPath("/p/$projectId/ai-visibility"),
        byPath("/p/$projectId/ai-visibility/research"),
        byPath("/p/$projectId/prompt-explorer"),
        byPath("/p/$projectId/context"),
        aiNavItem,
      ],
    },
    {
      label: "Configurar",
      items: [byPath("/p/$projectId/settings")],
    },
  ];
}

export const dataforseoHelpLinkOptions = linkOptions({
  to: "/help/dataforseo-api-key",
});
