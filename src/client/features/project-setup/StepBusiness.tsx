import { useState, type KeyboardEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import {
  createSetupDraft,
  saveSetupBusiness,
} from "@/serverFunctions/project-setup";
import {
  SetupCard,
  StepFooter,
  StepHeading,
  type SetupData,
} from "./setupShared";

const AUDIENCES = ["Pessoas físicas", "Empresas", "Pessoas e empresas"];

/** Step 1 (board 5a): name and domain are required, the rest helps suggest. */
export function StepBusiness({
  setup,
  onSaved,
  onCancel,
}: {
  /** Null on a new project: saving creates the draft. */
  setup: SetupData | null;
  onSaved: (projectId: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(setup?.project.name ?? "");
  const [domain, setDomain] = useState(setup?.project.domain ?? "");
  const [segment, setSegment] = useState(setup?.project.segment ?? "");
  const [audience, setAudience] = useState(setup?.project.audience ?? "");
  const [services, setServices] = useState<string[]>(setup?.services ?? []);
  const [serviceDraft, setServiceDraft] = useState("");

  const save = useMutation({
    mutationFn: async () => {
      const values = { name, domain, segment, audience, services };
      if (!setup) return (await createSetupDraft({ data: values })).projectId;
      await saveSetupBusiness({
        data: { projectId: setup.project.id, ...values },
      });
      return setup.project.id;
    },
    onSuccess: onSaved,
  });

  const addService = () => {
    const value = serviceDraft.trim();
    if (value && !services.includes(value)) setServices([...services, value]);
    setServiceDraft("");
  };
  const onServiceKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addService();
    }
  };
  const missing = name.trim() === "" || domain.trim() === "";

  return (
    <div className="flex flex-col gap-5">
      <StepHeading
        title="Qual site vamos acompanhar?"
        description="Essas informações ajudam a sugerir buscas e concorrentes. Só nome e domínio são obrigatórios."
      />
      <SetupCard>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="setup-name"
            label="Nome do projeto"
            note="Como aparece na carteira"
          >
            <Input
              id="setup-name"
              value={name}
              placeholder="Site da clínica"
              onChange={(event) => setName(event.target.value)}
              autoFocus
            />
          </Field>
          <Field
            id="setup-domain"
            label="Domínio do site"
            note="Sem «https://»"
          >
            <Input
              id="setup-domain"
              value={domain}
              placeholder="clinicaexemplo.com.br"
              onChange={(event) => setDomain(event.target.value)}
            />
          </Field>
          <Field id="setup-segment" label="Segmento" note="Opcional">
            <Input
              id="setup-segment"
              value={segment}
              placeholder="Saúde · Odontologia"
              onChange={(event) => setSegment(event.target.value)}
            />
          </Field>
          <Field
            id="setup-audience"
            label="Atende principalmente"
            note="Opcional"
          >
            <Input
              id="setup-audience"
              list="setup-audience-options"
              value={audience}
              placeholder="Pessoas físicas"
              onChange={(event) => setAudience(event.target.value)}
            />
            <datalist id="setup-audience-options">
              {AUDIENCES.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </Field>
        </div>
        <Field
          id="setup-services"
          label="Serviços principais"
          note="Opcional · usados para sugerir buscas. Enter para adicionar"
        >
          <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input px-2 py-1.5">
            {services.map((service) => (
              <span
                key={service}
                className="inline-flex items-center gap-1 rounded bg-accent px-2 py-0.5 text-[12.5px] text-primary"
              >
                {service}
                <button
                  type="button"
                  aria-label={`Remover ${service}`}
                  onClick={() =>
                    setServices(services.filter((item) => item !== service))
                  }
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
            <input
              id="setup-services"
              value={serviceDraft}
              placeholder="Adicionar serviço…"
              className="min-w-40 flex-1 bg-transparent py-0.5 text-sm outline-none"
              onChange={(event) => setServiceDraft(event.target.value)}
              onKeyDown={onServiceKey}
              onBlur={addService}
            />
          </div>
        </Field>
      </SetupCard>
      <p className="text-[12.5px] text-muted-foreground">
        Nas próximas etapas você escolhe o mercado, as buscas e os concorrentes.
        Nada é coletado antes da revisão final, e tudo fica salvo como rascunho.
      </p>
      {save.isError ? (
        <p className="text-sm text-destructive">
          {getStandardErrorMessage(save.error)}
        </p>
      ) : null}
      <StepFooter
        onBack={onCancel}
        onNext={() => save.mutate()}
        pending={save.isPending}
        disabled={missing}
        hint={missing ? "Preencha nome e domínio para continuar" : undefined}
      />
    </div>
  );
}

function Field({
  id,
  label,
  note,
  children,
}: {
  id: string;
  label: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      <span className="text-[11.5px] text-muted-foreground">{note}</span>
    </div>
  );
}
