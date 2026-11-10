import { createFileRoute } from "@tanstack/react-router";
import {
  CommandBlock,
  helpLinkClassName,
  SecretHelpPage,
} from "@/client/features/help/SecretHelpPage";
import { pageHead } from "@/client/lib/pageHead";

const DATAFORSEO_API_ACCESS_URL = "https://app.dataforseo.com/api-access";

export const Route = createFileRoute("/_app/help/dataforseo-api-key")({
  head: () => pageHead("Chave de API da DataForSEO"),
  component: DataforseoApiKeyHelpPage,
});

function DataforseoApiKeyHelpPage() {
  const requestStep = (
    <li>
      Go to{" "}
      <a
        className={helpLinkClassName}
        href={DATAFORSEO_API_ACCESS_URL}
        target="_blank"
        rel="noreferrer"
      >
        DataForSEO API Access
      </a>{" "}
      e peça as credenciais de API por e-mail.
    </li>
  );
  const encodeStep = (
    <li>
      Converta em Base64 seu login e senha de API da DataForSEO neste formato:
      <CommandBlock command="printf '%s' 'YOUR_LOGIN:YOUR_PASSWORD' | base64" />
    </li>
  );
  return (
    <SecretHelpPage
      title="Configure sua chave de API da DataForSEO"
      intro={
        <>
          OpenSEO needs the <code>DATAFORSEO_API_KEY</code> antes de rodar
          pesquisas de palavras, domínio e outros dados de SEO.
        </>
      }
      everyAppIntro="OpenSEO's keyword, domain, backlink and rank data comes from DataForSEO. On Every App the gateway holds the key once, for every app."
      secretName="DATAFORSEO_API_KEY"
      steps={
        <>
          {requestStep}
          {encodeStep}
          <li>
            Salve o resultado como a variável <code>DATAFORSEO_API_KEY</code> no
            seu ambiente.
          </li>
        </>
      }
      everyAppSteps={
        <>
          {requestStep}
          {encodeStep}
          <li>
            An owner or admin runs this from the Every App checkout and pastes
            the value:
            <CommandBlock command="pnpm everyapp secret set DATAFORSEO_API_KEY" />
          </li>
          <li>Recarregue o dataSEO: ele usa a chave na próxima requisição.</li>
        </>
      }
      dashboardPasteStep="Cole o valor em Base64 gerado pelo comando acima e salve."
      terminalPromptHint={
        <>
          Use o valor em Base64 de <code>login:password</code> when prompted.
        </>
      }
    />
  );
}
