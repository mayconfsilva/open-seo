import { useId } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Badge } from "@/client/components/ui/badge";
import { Button } from "@/client/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/client/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/client/components/ui/popover";
import { Switch } from "@/client/components/ui/switch";
import {
  RESULT_LIMITS,
  type KeywordMode,
} from "@/client/features/keywords/keywordResearchTypes";
import { isLabsLocationCode } from "@/client/features/keywords/locations";
import type { KeywordResearchControllerState } from "./types";

type Props = {
  controller: KeywordResearchControllerState;
};

const RESULT_ITEMS = RESULT_LIMITS.map((limit) => ({
  value: limit,
  label: `${limit} resultados`,
}));

const MODE_ITEMS: { value: KeywordMode; label: string }[] = [
  { value: "auto", label: "Automático" },
  { value: "suggestions", label: "Correspondência de frase" },
  { value: "ideas", label: "Ideias por categoria" },
  { value: "related", label: "As pessoas também buscam" },
];

const GOOGLE_ADS_ONLY_NOTE =
  "Indisponível para países com dados do Google Ads.";

/** The search settings most people leave at their defaults. */
export function KeywordSearchOptions({ controller }: Props) {
  const {
    controlsForm,
    preferredGroupKeywords: groupKeywords,
    setPreferredGroupKeywords: setGroupKeywords,
  } = controller;

  return (
    <controlsForm.Subscribe selector={(state) => state.values}>
      {(values) => {
        // Google-Ads-only countries ignore source, clickstream, and grouping.
        const labs = isLabsLocationCode(values.locationCode);
        const local = Boolean(values.locationName);

        // Options that don't apply to this search don't count.
        const changedCount = [
          values.resultLimit !== RESULT_LIMITS[0],
          labs && values.mode !== "auto",
          labs && !local && values.clickstream,
          labs && groupKeywords,
        ].filter(Boolean).length;

        return (
          <Popover>
            <PopoverTrigger
              render={<Button variant="outline" className="font-normal" />}
            >
              <SlidersHorizontal data-icon="inline-start" />
              Opções
              {changedCount > 0 ? (
                <Badge variant="secondary" size="sm">
                  {changedCount}
                </Badge>
              ) : null}
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 gap-4 p-4">
              <controlsForm.AppField name="resultLimit">
                {(field) => (
                  <field.SelectField label="Resultados" items={RESULT_ITEMS} />
                )}
              </controlsForm.AppField>

              <controlsForm.AppField name="mode">
                {(field) => (
                  <field.SelectField
                    label="Origem das palavras"
                    description={labs ? undefined : GOOGLE_ADS_ONLY_NOTE}
                    items={MODE_ITEMS}
                    disabled={!labs}
                  />
                )}
              </controlsForm.AppField>

              <controlsForm.Field name="clickstream">
                {(field) => (
                  <ToggleRow
                    label="Volumes refinados por clickstream"
                    help={
                      !labs
                        ? GOOGLE_ADS_ONLY_NOTE
                        : local
                          ? "Indisponível para resultados locais. Os dados de clickstream cobrem só países inteiros."
                          : "O Google informa um volume único para palavras parecidas. Isto estima o volume de cada uma. Custa o dobro de créditos."
                    }
                    // The saved choice returns when the option applies again.
                    checked={labs && !local && field.state.value}
                    disabled={!labs || local}
                    onChange={(checked) => field.handleChange(checked)}
                  />
                )}
              </controlsForm.Field>

              <ToggleRow
                label="Agrupar palavras"
                help={labs ? undefined : GOOGLE_ADS_ONLY_NOTE}
                checked={labs && groupKeywords}
                disabled={!labs}
                onChange={setGroupKeywords}
              />
            </PopoverContent>
          </Popover>
        );
      }}
    </controlsForm.Subscribe>
  );
}

function ToggleRow({
  label,
  help,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  help?: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();

  return (
    <Field orientation="horizontal" data-disabled={disabled}>
      <FieldContent>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {help ? (
          <FieldDescription id={`${id}-description`}>{help}</FieldDescription>
        ) : null}
      </FieldContent>
      <Switch
        id={id}
        aria-describedby={help ? `${id}-description` : undefined}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </Field>
  );
}
