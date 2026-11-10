import {
  Bot,
  ClipboardCheck,
  FolderPlus,
  Globe,
  Lightbulb,
  Users,
} from "lucide-react";
import type { DashboardActivation } from "@/server/features/dashboard/services/DashboardService";
import type { DashboardSetupStep } from "@/types/schemas/dashboard";

export const setupSteps: {
  id: DashboardSetupStep;
  label: string;
  detail: string;
  icon: typeof Globe;
  skipLabel: string;
}[] = [
  {
    id: "competitor",
    label: "Explorar um concorrente",
    detail: "Encontre temas e links com que aprender.",
    icon: Globe,
    skipLabel: "Pular por enquanto",
  },
  {
    id: "keywords",
    label: "Ideias de palavras",
    detail: "Comece por uma palavra e veja o que as pessoas buscam.",
    icon: Lightbulb,
    skipLabel: "Pular por enquanto",
  },
  {
    id: "audit",
    label: "Auditar seu site",
    detail: "Rastreie links quebrados, tags ausentes e problemas de indexação.",
    icon: ClipboardCheck,
    skipLabel: "Pular por enquanto",
  },
  {
    id: "mcp",
    label: "Conectar seu agente de IA",
    detail: "Use o dataSEO dentro do Claude ou do seu agente favorito.",
    icon: Bot,
    skipLabel: "Pular por enquanto",
  },
  {
    id: "team",
    label: "Convidar alguém da equipe",
    detail: "Divida o trabalho ou siga sozinho por enquanto.",
    icon: Users,
    skipLabel: "Pular",
  },
  {
    id: "project",
    label: "Trabalha com vários sites?",
    detail:
      "Crie outro projeto ou deixe seu agente de IA cadastrar uma lista de sites.",
    icon: FolderPlus,
    skipLabel: "Só preciso de um projeto",
  },
];

export function getStepStatus(
  activation: DashboardActivation,
  step: DashboardSetupStep,
): "done" | "skipped" | "todo" {
  const completed: Record<DashboardSetupStep, boolean> = {
    competitor: activation.competitorResearchedAt !== null,
    keywords: activation.keywordsResearchedAt !== null,
    audit: activation.hasAudit,
    mcp:
      activation.mcp.authorizedAt !== null ||
      activation.mcp.firstToolCallAt !== null,
    team: activation.hasTeammate,
    project: activation.hasMultipleProjects,
  };
  if (completed[step]) return "done";
  if (!activation.dismissedSteps.includes(step)) return "todo";
  return completeWhenSkipped.has(step) ? "done" : "skipped";
}

// Skipping these marks them complete, so they never wait in "saved for later".
const completeWhenSkipped = new Set<DashboardSetupStep>(["team", "project"]);
