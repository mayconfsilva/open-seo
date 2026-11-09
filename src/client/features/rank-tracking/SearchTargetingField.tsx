import { useId } from "react";
import { SerpLocationCombobox } from "@/client/components/SerpLocationCombobox";
import { usePrewarmSerpLocations } from "@/client/components/usePrewarmSerpLocations";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/client/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/client/components/ui/radio-group";

type TargetingMode = "national" | "local";

export function SearchTargetingField({
  mode,
  onModeChange,
  locationName,
  onLocationNameChange,
  countryCode,
  error,
}: {
  mode: TargetingMode;
  onModeChange: (mode: TargetingMode) => void;
  locationName: string | undefined;
  onLocationNameChange: (locationName: string | undefined) => void;
  countryCode: string;
  /** The error for the city, shown under the city search. */
  error?: string;
}) {
  const id = useId();
  // Warm the moment Local targeting is in play.
  usePrewarmSerpLocations(countryCode, mode === "local");
  return (
    <FieldSet className="gap-2" data-invalid={error ? true : undefined}>
      <FieldLegend variant="label" className="mb-0">
        Alcance da busca
      </FieldLegend>
      <RadioGroup
        value={mode}
        onValueChange={(value) => {
          if (value === "local") onModeChange("local");
          if (value === "national") {
            onModeChange("national");
            onLocationNameChange(undefined);
          }
        }}
        className="flex gap-4"
      >
        <Field orientation="horizontal" className="w-auto">
          <RadioGroupItem value="national" id={`${id}-national`} />
          <FieldLabel htmlFor={`${id}-national`} className="font-normal">
            Nacional
          </FieldLabel>
        </Field>
        <Field orientation="horizontal" className="w-auto">
          <RadioGroupItem value="local" id={`${id}-local`} />
          <FieldLabel htmlFor={`${id}-local`} className="font-normal">
            Local
          </FieldLabel>
        </Field>
      </RadioGroup>
      <FieldDescription>
        {mode === "local" ? (
          <>
            <span className="font-medium text-success">Ideal para:</span> "near
            me" queries, city/county keywords, service-area pages.
          </>
        ) : (
          <>
            O alcance local pode subestimar posições de buscas sem nome de
            cidade.
          </>
        )}
      </FieldDescription>
      {mode === "local" && (
        <>
          <FieldLabel htmlFor={`${id}-city`} className="sr-only">
            Cidade ou região
          </FieldLabel>
          <SerpLocationCombobox
            id={`${id}-city`}
            value={locationName}
            onChange={onLocationNameChange}
            countryCode={countryCode}
            placeholder="Buscar cidades..."
            invalid={Boolean(error)}
          />
        </>
      )}
      {error ? <FieldError>{error}</FieldError> : null}
    </FieldSet>
  );
}
