import { createFileRoute } from "@tanstack/react-router";
import { Link2, ListPlus, MessagesSquare } from "lucide-react";
import { z } from "zod";
import { PromptResearchPage } from "@/client/features/ai-visibility/PromptResearchPage";
import { PromptTrackingWithoutUpgradeButton } from "@/client/features/ai-visibility/shared";
import { PaidPlanGate } from "@/client/features/billing/PaidPlanGate";
import { pageHead } from "@/client/lib/pageHead";

export const Route = createFileRoute(
  "/_app/p/$projectId/ai-visibility/research",
)({
  head: () => pageHead("Pesquisa de prompts"),
  validateSearch: z.object({ q: z.string().trim().max(100).optional() }),
  component: AiResearchRoute,
});

const PROMPT_RESEARCH_FEATURES = [
  {
    icon: MessagesSquare,
    title: "Perguntas sobre seu mercado",
    body: "Veja as perguntas que as pessoas fazem sobre uma palavra, das mais comuns para as menos, com a resposta do ChatGPT para cada uma.",
  },
  {
    icon: Link2,
    title: "Quem é citado",
    body: "Veja quais sites o ChatGPT citou ao responder e se o seu está entre eles.",
  },
  {
    icon: ListPlus,
    title: "Acompanhe as que importam",
    body: "Escolha as perguntas que valem acompanhar e adicione ao acompanhamento de prompts num passo só.",
  },
];

function AiResearchRoute() {
  const { projectId } = Route.useParams();
  const { q } = Route.useSearch();
  return (
    <PaidPlanGate
      feature="Pesquisa de prompts"
      description="Encontre as perguntas sobre seu mercado, veja como o ChatGPT responde e quais sites as respostas citam."
      features={PROMPT_RESEARCH_FEATURES}
      alternative={<PromptTrackingWithoutUpgradeButton projectId={projectId} />}
    >
      <PromptResearchPage key={projectId} projectId={projectId} keyword={q} />
    </PaidPlanGate>
  );
}
