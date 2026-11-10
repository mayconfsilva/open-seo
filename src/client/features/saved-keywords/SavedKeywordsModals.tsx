import { AlertCircle } from "lucide-react";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { Alert, AlertDescription } from "@/client/components/ui/alert";

export function RemoveSavedKeywordsError({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export function DeleteSavedKeywordsModal({
  selectedCount,
  isPending,
  onClose,
  onConfirm,
}: {
  selectedCount: number;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const plural = selectedCount !== 1 ? "s" : "";
  return (
    <ConfirmDialog
      title="Excluir palavras?"
      confirmLabel={`Excluir ${selectedCount} palavra${plural}`}
      destructive
      pending={isPending}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      Isto vai excluir de vez {selectedCount} saved keyword{plural}.
    </ConfirmDialog>
  );
}
