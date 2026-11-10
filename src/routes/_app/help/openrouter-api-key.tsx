import { createFileRoute } from "@tanstack/react-router";
import {
  CommandBlock,
  helpLinkClassName,
  SecretHelpPage,
} from "@/client/features/help/SecretHelpPage";
import { pageHead } from "@/client/lib/pageHead";

const OPENROUTER_KEYS_URL = "https://openrouter.ai/settings/keys";

export const Route = createFileRoute("/_app/help/openrouter-api-key")({
  head: () => pageHead("Chave de API do OpenRouter"),
  component: OpenrouterApiKeyHelpPage,
});

function OpenrouterApiKeyHelpPage() {
  const accountStep = (
    <li>
      Crie uma conta em{" "}
      <a
        className={helpLinkClassName}
        href="https://openrouter.ai"
        target="_blank"
        rel="noreferrer"
      >
        openrouter.ai
      </a>{" "}
      e adicione créditos (pré-pago, como na DataForSEO).
    </li>
  );
  const keyStep = (
    <li>
      Go to{" "}
      <a
        className={helpLinkClassName}
        href={OPENROUTER_KEYS_URL}
        target="_blank"
        rel="noreferrer"
      >
        OpenRouter API Keys
      </a>{" "}
      e clique em "Create API Key".
    </li>
  );
  return (
    <SecretHelpPage
      title="Configure sua chave de API do OpenRouter"
      intro={
        <>
          OpenSEO needs the <code>OPENROUTER_API_KEY</code> antes de usar recursos de IA como o SAM, o agente de SEO do app. É opcional: todo o resto funciona sem ela.
        </>
      }
      everyAppIntro="SAM, prompt suggestions and website research run on OpenRouter. On Every App the gateway holds the key once, for every app."
      secretName="OPENROUTER_API_KEY"
      steps={
        <>
          {accountStep}
          {keyStep}
          <li>
            Salve a chave como a variável <code>OPENROUTER_API_KEY</code> no seu ambiente:
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Docker: <code>.env</code>
              </li>
              <li>Cloudflare: defina no painel do Workers (veja abaixo)</li>
              <li>
                Desenvolvimento local: <code>.env.local</code>
              </li>
            </ul>
          </li>
          <li>Reinicie o dataSEO.</li>
        </>
      }
      everyAppSteps={
        <>
          {accountStep}
          {keyStep}
          <li>
            An owner or admin runs this from the Every App checkout and pastes
            the key:
            <CommandBlock command="pnpm everyapp secret set OPENROUTER_API_KEY" />
          </li>
          <li>Recarregue o dataSEO.</li>
        </>
      }
      dashboardPasteStep="Cole sua chave do OpenRouter e salve."
      terminalPromptHint="Cole sua chave do OpenRouter quando pedir."
    />
  );
}
