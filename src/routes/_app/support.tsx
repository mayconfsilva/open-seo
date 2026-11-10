import { createFileRoute } from "@tanstack/react-router";
import { CopyButton } from "@/client/components/CopyButton";
import { PageHeader } from "@/client/components/PageHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { SUPPORT_EMAIL } from "@/client/lib/support";
import { pageHead } from "@/client/lib/pageHead";

const DISCORD_URL = "https://discord.gg/c9uGs3cFXr";
const GITHUB_URL = "https://github.com/every-app/open-seo";

export const Route = createFileRoute("/_app/support")({
  head: () => pageHead("Ajuda e comunidade"),
  component: SupportPage,
});

function SupportPage() {
  return (
    <div className="h-full overflow-auto px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            Ajuda e comunidade
          </p>
          <PageHeader
            title="Queremos ouvir você"
            description="Queremos conversar com você! Estamos abertos a sugestões e queremos entender como você trabalha para melhorar o produto."
          />
        </div>

        <div className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>E-mail</h2>
              </CardTitle>
              <CardDescription>
                Envie ideias, problemas, dúvidas ou sugestões direto.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CopyButton
                value={SUPPORT_EMAIL}
                label={SUPPORT_EMAIL}
                successMessage="E-mail copiado"
                size="sm"
              />
            </CardContent>
          </Card>

          <SupportLinkCard
            href={DISCORD_URL}
            title="Discord"
            description="Peça ajuda, compartilhe ideias e aprenda com a comunidade."
            cta="Entrar no Discord"
          />

          <SupportLinkCard
            href={`${GITHUB_URL}/issues`}
            title="GitHub Issues"
            description="Relate erros ou peça recursos no GitHub."
            cta="Abrir uma issue"
          />
        </div>
      </div>
    </div>
  );
}

function SupportLinkCard({
  href,
  title,
  description,
  cta,
}: {
  href: string;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="group block">
      <Card className="transition-colors group-hover:border-foreground/20">
        <CardHeader>
          <CardTitle>
            <h2>{title}</h2>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="font-medium">
          {cta} <span aria-hidden="true">&rarr;</span>
        </CardContent>
      </Card>
    </a>
  );
}
