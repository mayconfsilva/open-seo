import { useId, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { cn } from "cn";
import { CountryCombobox } from "@/client/components/CountryCombobox";
import { Label } from "@/client/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import { SearchTargetingField } from "@/client/features/rank-tracking/SearchTargetingField";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { saveSetupMarket } from "@/serverFunctions/project-setup";
import {
  getIsoCountryCode,
  getLanguageCode,
  LOCATION_OPTIONS,
  SERP_LANGUAGE_OPTIONS,
} from "@/shared/keyword-locations";
import {
  SetupCard,
  StepFooter,
  StepHeading,
  type SetupData,
} from "./setupShared";

type Devices = "both" | "desktop" | "mobile";

const DEVICES: Array<{
  value: Devices;
  label: string;
  help: string;
  impact: string;
}> = [
  {
    value: "mobile",
    label: "Celular",
    help: "Como a maioria das pessoas busca hoje",
    impact: "1 consulta por palavra",
  },
  {
    value: "desktop",
    label: "Computador",
    help: "Para quem é buscado no trabalho, por empresas",
    impact: "1 consulta por palavra",
  },
  {
    value: "both",
    label: "Celular e computador",
    help: "As posições costumam ser diferentes nos dois",
    impact: "2 consultas por palavra",
  },
];

const LANGUAGE_ITEMS = SERP_LANGUAGE_OPTIONS.map((language) => ({
  value: language.code,
  label: language.label,
}));

const DEFAULT_LOCATION = 2076; // Brasil

/** Step 2 (board 5b): where, in which language and on which device. */
export function StepMarket({
  setup,
  onBack,
  onSaved,
}: {
  setup: SetupData;
  onBack: () => void;
  onSaved: () => void;
}) {
  const countryId = useId();
  const languageId = useId();
  const [locationCode, setLocationCode] = useState(
    setup.config?.locationCode ?? DEFAULT_LOCATION,
  );
  const [languageCode, setLanguageCode] = useState(
    setup.config?.languageCode ?? getLanguageCode(DEFAULT_LOCATION),
  );
  const [locationName, setLocationName] = useState<string | undefined>(
    setup.config?.locationName ?? undefined,
  );
  const [local, setLocal] = useState(Boolean(setup.config?.locationName));
  const [devices, setDevices] = useState<Devices>(
    setup.config?.devices ?? "mobile",
  );

  const save = useMutation({
    mutationFn: () =>
      saveSetupMarket({
        data: {
          projectId: setup.project.id,
          locationCode,
          languageCode,
          locationName: local ? (locationName ?? null) : null,
          devices,
        },
      }),
    onSuccess: onSaved,
  });

  const country =
    LOCATION_OPTIONS.find((option) => option.code === locationCode)?.label ??
    "o país escolhido";
  const language =
    LANGUAGE_ITEMS.find((item) => item.value === languageCode)?.label ??
    languageCode;
  const where = local && locationName ? locationName : country;
  const device =
    devices === "both"
      ? "no celular e no computador"
      : devices === "mobile"
        ? "no celular"
        : "no computador";
  const missingCity = local && !locationName;

  return (
    <div className="flex flex-col gap-5">
      <StepHeading
        title="Onde e como seus clientes pesquisam?"
        description="O Google mostra resultados diferentes por cidade, idioma e dispositivo. As posições serão coletadas exatamente nesse contexto."
      />
      <SetupCard>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={countryId}>País</Label>
            <CountryCombobox
              id={countryId}
              value={locationCode}
              onChange={(code) => {
                setLocationCode(code);
                setLanguageCode(getLanguageCode(code));
                setLocationName(undefined);
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={languageId}>Idioma das buscas</Label>
            <Select
              items={LANGUAGE_ITEMS}
              value={languageCode}
              onValueChange={(value) => value && setLanguageCode(value)}
            >
              <SelectTrigger id={languageId} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_ITEMS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <SearchTargetingField
          mode={local ? "local" : "national"}
          onModeChange={(mode) => setLocal(mode === "local")}
          locationName={locationName}
          onLocationNameChange={setLocationName}
          countryCode={getIsoCountryCode(locationCode)}
          error={missingCity ? "Escolha a cidade ou região" : undefined}
        />
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Dispositivo</span>
          <div className="grid gap-2 sm:grid-cols-3">
            {DEVICES.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={devices === option.value}
                onClick={() => setDevices(option.value)}
                className={cn(
                  "flex flex-col gap-1 rounded-md border p-3 text-left",
                  devices === option.value
                    ? "border-primary bg-accent"
                    : "border-border hover:bg-muted/40",
                )}
              >
                <span className="text-[13.5px] font-semibold">
                  {option.label}
                </span>
                <span className="text-[12px] text-muted-foreground">
                  {option.help}
                </span>
                <span className="text-[11.5px] text-muted-foreground">
                  {option.impact}
                </span>
              </button>
            ))}
          </div>
        </div>
      </SetupCard>
      <div className="rounded-lg border border-border bg-accent/50 px-4 py-3 text-[13px]">
        <span className="block text-[11px] font-semibold tracking-[.06em] text-muted-foreground">
          COMO VAMOS PESQUISAR
        </span>
        Como uma pessoa em <strong>{where}</strong>, usando o Google em{" "}
        <strong>{language}</strong>, <strong>{device}</strong>. A posição de uma
        busca pode ser diferente em outra cidade ou dispositivo, por isso
        comparamos sempre no mesmo contexto.
      </div>
      {save.isError ? (
        <p className="text-sm text-destructive">
          {getStandardErrorMessage(save.error)}
        </p>
      ) : null}
      <StepFooter
        onBack={onBack}
        onNext={() => save.mutate()}
        pending={save.isPending}
        disabled={missingCity}
        hint="Próxima: Fontes e páginas (opcional)"
      />
    </div>
  );
}
