import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { SectionHeader } from "@/client/components/PageHeader";
import {
  updatePrivacyChoices,
  usePrivacyChoices,
} from "@/client/components/PrivacyChoices";
import { Switch } from "@/client/components/ui/switch";
import { useSession } from "@/lib/auth-client";
import { setProductUpdatesOptIn } from "@/serverFunctions/product-updates";

export function PrivacySettings() {
  const choices = usePrivacyChoices();
  const { data: session, refetch } = useSession();
  const productUpdates = useMutation({
    mutationFn: (optIn: boolean) => setProductUpdatesOptIn({ data: { optIn } }),
    // The session is served from a signed cookie cache, so bypass it to pick
    // up the saved choice.
    onSuccess: () => refetch({ query: { disableCookieCache: true } }),
    onError: () => toast.error("Não foi possível salvar sua escolha de e-mails."),
  });
  if (!choices || !session) return null;

  return (
    <section className="space-y-3">
      <SectionHeader title="Privacidade e e-mails" />
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm">Dados de uso</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Compartilhar dados de uso e gravações de sessão para ajudar a melhorar o produto.
          </p>
        </div>
        <Switch
          checked={choices.analytics}
          onCheckedChange={(analytics) =>
            void updatePrivacyChoices({ ...choices, analytics }, true)
          }
          aria-label="Compartilhar dados de uso"
        />
      </div>
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-sm">Novidades do produto</p>
          <p className="mt-1 text-sm text-muted-foreground">
            E-mails ocasionais com novidades e dicas. Cancele quando quiser.
          </p>
        </div>
        <Switch
          checked={
            productUpdates.isPending
              ? productUpdates.variables
              : session.user.productUpdatesOptIn === true
          }
          disabled={productUpdates.isPending}
          onCheckedChange={(optIn) => productUpdates.mutate(optIn)}
          aria-label="Receber e-mails de novidades"
        />
      </div>
    </section>
  );
}
