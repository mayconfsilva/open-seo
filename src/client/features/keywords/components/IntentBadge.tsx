import type { KeywordIntent } from "@/types/keywords";
import { Badge } from "@/client/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";

const VARIANTS: Record<
  KeywordIntent,
  "info" | "warning" | "success" | "soft" | "secondary"
> = {
  informational: "info",
  commercial: "warning",
  transactional: "success",
  navigational: "soft",
  unknown: "secondary",
};

const SHORT_LABELS: Record<KeywordIntent, string> = {
  informational: "Info",
  commercial: "Com",
  transactional: "Trans",
  navigational: "Nav",
  unknown: "?",
};

/** Full intent labels, shared with the keyword filters so both stay in sync. */
export const INTENT_LABELS: Record<KeywordIntent, string> = {
  informational: "Informacional",
  commercial: "Comercial",
  transactional: "Transacional",
  navigational: "Navegacional",
  unknown: "Desconhecido",
};

const DESCRIPTIONS: Record<
  KeywordIntent,
  { label: string; description: string }
> = {
  informational: {
    label: INTENT_LABELS.informational,
    description:
      "Quem busca quer informação ou respostas. Use para conteúdo educativo, guias e explicações.",
  },
  commercial: {
    label: INTENT_LABELS.commercial,
    description:
      "Quem busca está avaliando opções antes de comprar. Trate como intenção de compra para comparações, alternativas e páginas de produto.",
  },
  transactional: {
    label: INTENT_LABELS.transactional,
    description:
      "Quem busca está pronto para agir, geralmente comprar. Priorize ofertas claras, preços, testes ou caminhos de conversão.",
  },
  navigational: {
    label: INTENT_LABELS.navigational,
    description:
      "Quem busca procura um site, marca ou página específica. Essas buscas costumam favorecer o destino esperado.",
  },
  unknown: {
    label: INTENT_LABELS.unknown,
    description:
      "A intenção não está disponível para esta palavra, então não decida a estratégia de conteúdo só por este selo.",
  },
};

export function IntentBadge({ intent }: { intent: KeywordIntent }) {
  const details = DESCRIPTIONS[intent];

  return (
    <Tooltip>
      <TooltipTrigger
        delay={0}
        render={
          <Badge
            variant={VARIANTS[intent]}
            tabIndex={0}
            className="h-6 min-w-11 cursor-help font-semibold"
          />
        }
        aria-label={`Intenção de busca: ${details.label}`}
      >
        {SHORT_LABELS[intent]}
      </TooltipTrigger>
      <TooltipContent className="flex-col items-start gap-1">
        <span className="font-semibold">{details.label}</span>
        <span>{details.description}</span>
      </TooltipContent>
    </Tooltip>
  );
}
