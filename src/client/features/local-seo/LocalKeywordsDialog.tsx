import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormDialog } from "@/client/components/FormDialog";
import { useAppForm } from "@/client/components/form/useAppForm";
import { QueryError } from "@/client/components/QueryState";
import { Button } from "@/client/components/ui/button";
import { updateLocalKeywords } from "@/serverFunctions/local-seo";
import { cleanKeywords, LocalKeywordFields } from "./LocalKeywordFields";

export function LocalKeywordsDialog({
  projectId,
  trackerId,
  keywords,
  onClose,
}: {
  projectId: string;
  trackerId: string;
  keywords: { keyword: string }[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: (terms: string[]) =>
      updateLocalKeywords({ data: { projectId, trackerId, keywords: terms } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["localSeo", projectId],
      });
      onClose();
    },
  });
  const form = useAppForm({
    defaultValues: {
      keywords: keywords.length ? keywords.map((row) => row.keyword) : [""],
    },
    onSubmit: async ({ value }) => {
      await save.mutateAsync(cleanKeywords(value.keywords));
    },
  });
  return (
    <FormDialog
      title="Gerenciar palavras"
      onClose={onClose}
      actions={
        <>
          <Button variant="outline" disabled={save.isPending} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="local-keywords" pending={save.isPending}>
            Salvar palavras
          </Button>
        </>
      }
    >
      <form.AppForm>
        <form.Form id="local-keywords" className="space-y-4">
          <form.Field name="keywords">
            {(field) => (
              <LocalKeywordFields
                value={field.state.value}
                onChange={field.handleChange}
                description="Cada coleta busca todas as palavras em todos os pontos. Os resultados de palavras removidas são mantidos."
              />
            )}
          </form.Field>
        </form.Form>
      </form.AppForm>
      {save.isError && (
        <QueryError
          error={save.error}
          fallback="Não foi possível salvar estas palavras."
        />
      )}
    </FormDialog>
  );
}
