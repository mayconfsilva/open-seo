import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { everyAppAccountQueryOptions } from "@/client/features/every-app/everyAppAccountQueries";
import { z } from "zod";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/client/components/ui/tabs";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { PageHeader } from "@/client/components/PageHeader";
import { ArrowUpRight, Info } from "lucide-react";
import { getClientAuthMode } from "@/lib/auth-mode";
import { captureClientEvent } from "@/client/lib/posthog";
import {
  agentUpdatePrompt,
  getAgentSetupPrompt,
} from "@/client/features/ai-mcp/agentSetupPrompt";
import { CopyButton } from "@/client/components/CopyButton";
import { AgentList } from "@/client/features/ai-mcp/AgentList";
import { pageHead } from "@/client/lib/pageHead";

const DOCS_URL = "https://openseo.so/docs/agent-setup";

const COACH_DOCS_URL = "https://openseo.so/docs/skills/seo-coach";
const LINK_CLASS =
  "text-foreground underline decoration-foreground/25 underline-offset-4 hover:decoration-foreground";
const MUTED_LINK_CLASS =
  "inline-flex items-center gap-1 text-sm text-muted-foreground underline decoration-foreground/25 underline-offset-4 hover:text-foreground";
const SKILLS = [
  ["seo-coach", "Explica onde você está e escolhe o próximo passo."],
  [
    "seo-project-setup",
    "Salva metas, concorrentes e páginas principais como contexto compartilhado.",
  ],
  [
    "seo-audit",
    "One-page site audit built around a single do-this-week action.",
  ],
  [
    "ai-visibility-audit",
    "Encontra as poucas mudanças com mais chance de fazer você ser citado nas respostas de IA.",
  ],
  [
    "ai-prompt-research",
    "Descobre o que as pessoas perguntam ao ChatGPT sobre seu mercado e quem é citado.",
  ],
  ["keyword-research", "Encontra oportunidades de palavras a partir de alguns temas iniciais."],
  ["keyword-clustering", "Agrupa palavras por intenção e liga cada grupo a uma página."],
  ["competitive-landscape", "Mapeia quem ganha no seu mercado e por quê."],
  [
    "competitor-analysis",
    "Estuda as palavras, o conteúdo e os backlinks de um concorrente.",
  ],
  ["link-prospecting", "Encontra oportunidades de links e escreve os contatos."],
  ["local-seo", "Audita um Perfil da Empresa no Google e a visibilidade no Maps."],
  ["seo-report", "Salva qualquer um dos itens acima como relatório na página Relatórios."],
];

const aiSearchSchema = z.object({
  // Active tab. Omitted for the default "setup" tab.
  tab: z.enum(["skills"]).optional().catch(undefined),
});

export const Route = createFileRoute("/_app/ai")({
  head: () => pageHead("Configuração do agente"),
  validateSearch: aiSearchSchema,
  component: AiPage,
});

const everyApp = getClientAuthMode() === "everyapp";

function AiPage() {
  const { tab = "setup" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const origin = window.location.origin;
  const mcpUrl = `${origin}/mcp`;
  const prompt = getAgentSetupPrompt(origin);

  return (
    <div className="h-full overflow-auto px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          title="Configuração do agente"
          description="O jeito mais poderoso de usar o dataSEO é pelo agente de IA que você já usa. Configure uma vez e pergunte o que quiser."
        />

        <Tabs
          value={tab}
          onValueChange={(value) =>
            void navigate({
              search: { tab: value === "skills" ? "skills" : undefined },
              replace: true,
            })
          }
          className="mt-8"
        >
          <TabsList variant="line">
            <TabsTrigger value="setup">Configure seu agente</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
          </TabsList>
          <TabsContent value="setup">
            {everyApp ? (
              <EveryAppAgentSetup />
            ) : (
              <>
                <div className="mt-6 space-y-5">
                  <Card size="lg">
                    <CardHeader>
                      <CardTitle>
                        <h2>Configure seu agente</h2>
                      </CardTitle>
                      <CardDescription>
                        Cole o prompt de configuração no seu agente para conectar o dataSEO e instalar as skills de SEO. Ele guia você nos passos manuais.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <AgentList />
                      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
                        <CopyButton
                          variant="default"
                          size="lg"
                          value={prompt}
                          label="Copiar prompt de configuração"
                          successMessage="Prompt de configuração copiado"
                          onCopy={() =>
                            captureClientEvent("mcp:setup_prompt_copy")
                          }
                        />
                        <a
                          href={`${DOCS_URL}#set-up-your-agent`}
                          target="_blank"
                          rel="noreferrer"
                          className={MUTED_LINK_CLASS}
                        >
                          Instruções de configuração
                          <ArrowUpRight className="size-3.5" />
                        </a>
                      </div>
                    </CardContent>
                    <CardFooter className="text-muted-foreground">
                      <p>
                        Depois de conectar, peça ao seu agente para usar{" "}
                        <a
                          href={COACH_DOCS_URL}
                          target="_blank"
                          rel="noreferrer"
                          className={LINK_CLASS}
                        >
                          Mentor de SEO
                        </a>{" "}
                        to help you choose what to do next.
                      </p>
                    </CardFooter>
                  </Card>

                  <Card size="lg">
                    <CardHeader>
                      <CardTitle>
                        <h2>Atualize suas skills</h2>
                      </CardTitle>
                      <CardDescription>
                        Já conectou? Cole o prompt de atualização no seu agente para receber as skills mais recentes, mantendo a conexão e suas edições.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-center gap-x-5 gap-y-3">
                      <CopyButton
                        variant="default"
                        size="lg"
                        value={agentUpdatePrompt}
                        label="Copiar prompt de atualização"
                        successMessage="Prompt de atualização copiado"
                        onCopy={() =>
                          captureClientEvent("mcp:update_prompt_copy")
                        }
                      />
                      <a
                        href={`${DOCS_URL}#update-your-skills`}
                        target="_blank"
                        rel="noreferrer"
                        className={MUTED_LINK_CLASS}
                      >
                        Instruções de atualização
                        <ArrowUpRight className="size-3.5" />
                      </a>
                    </CardContent>
                  </Card>
                </div>

                {getClientAuthMode() === "cloudflare_access" ? (
                  <Alert className="mt-8">
                    <Info />
                    <AlertDescription>
                      This instance is behind Cloudflare Access, so MCP clients
                      connect through Managed OAuth on your Access application.
                      If a client gets a login page instead of connecting, check
                      that Managed OAuth is on.{" "}
                      <a
                        href="https://github.com/every-app/open-seo/blob/main/docs/SELF_HOSTING_CLOUDFLARE_OPERATIONS.md#through-cloudflare-access"
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium"
                      >
                        Guia de configuração
                      </a>
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className="mt-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border pt-5 text-xs text-muted-foreground">
                  <span>
                    URL do servidor MCP desta instalação:{" "}
                    <code className="font-mono text-foreground/80">
                      {mcpUrl}
                    </code>
                  </span>
                  <CopyButton
                    value={mcpUrl}
                    successMessage="URL do MCP copiada"
                    onCopy={() => captureClientEvent("mcp:setup_url_copy")}
                  />
                </div>
              </>
            )}
          </TabsContent>
          <TabsContent value="skills">
            <section className="mt-6">
              <p className="text-sm text-muted-foreground">
                {everyApp
                  ? "Instale com npx skills add every-app/open-seo."
                  : "O prompt de configuração instala estas."}{" "}
                Rode uma pelo nome quando quiser um relatório completo em vez de uma resposta rápida.
              </p>
              <ul className="mt-5 space-y-3 text-sm sm:space-y-2">
                {SKILLS.map(([name, blurb]) => (
                  <li
                    key={name}
                    className="flex flex-col gap-0.5 sm:flex-row sm:gap-3"
                  >
                    <a
                      href={`https://openseo.so/docs/skills/${name}`}
                      target="_blank"
                      rel="noreferrer"
                      className={`shrink-0 font-mono text-[13px] sm:w-48 ${LINK_CLASS}`}
                    >
                      /{name}
                    </a>
                    <span className="text-muted-foreground">{blurb}</span>
                  </li>
                ))}
              </ul>
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

const EVERY_APP_SKILLS_COMMAND = "npx skills add every-app/open-seo";

/**
 * Behind Every App the agent connects to the gateway's MCP address, which
 * covers every app on it; OpenSEO serves no MCP of its own here. The skills
 * install on their own.
 */
function EveryAppAgentSetup() {
  const gatewayUrl = useQuery(everyAppAccountQueryOptions()).data?.gatewayUrl;
  return (
    <div className="mt-6 space-y-5">
      <Card size="lg">
        <CardHeader>
          <CardTitle>
            <h2>Connect your agent to Every App</h2>
          </CardTitle>
          <CardDescription>
            Every App has one address for your agent, and it covers OpenSEO and
            your other apps. Connect it once.
          </CardDescription>
        </CardHeader>
        {gatewayUrl ? (
          <CardContent className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <code className="font-mono text-sm">{gatewayUrl}/mcp</code>
            <CopyButton
              value={`${gatewayUrl}/mcp`}
              successMessage="URL do MCP copiada"
            />
          </CardContent>
        ) : null}
      </Card>

      <Card size="lg">
        <CardHeader>
          <CardTitle>
            <h2>Install the SEO skills</h2>
          </CardTitle>
          <CardDescription>
            Run this in a terminal to add OpenSEO's skills to your agent. They
            use OpenSEO through your Every App connection.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <code className="font-mono text-sm">{EVERY_APP_SKILLS_COMMAND}</code>
          <CopyButton
            value={EVERY_APP_SKILLS_COMMAND}
            successMessage="Comando copiado"
          />
        </CardContent>
        <CardFooter className="text-muted-foreground">
          <p>
            Depois de conectar, peça ao seu agente para usar{" "}
            <a
              href={COACH_DOCS_URL}
              target="_blank"
              rel="noreferrer"
              className={LINK_CLASS}
            >
              Mentor de SEO
            </a>{" "}
            to help you choose what to do next.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
