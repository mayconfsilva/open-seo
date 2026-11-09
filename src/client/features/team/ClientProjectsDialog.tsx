import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/client/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import { ProjectChecklist } from "@/client/features/team/InviteTeammateModal";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { setClientProjects } from "@/serverFunctions/organization";

/** dataSEO: change which projects a client member can read. */
export function ClientProjectsDialog({
  userId,
  email,
  projects,
  initial,
  onClose,
  onSaved,
}: {
  userId: string;
  email: string;
  projects: Array<{ id: string; name: string; domain: string | null }>;
  initial: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState(initial);
  const save = useMutation({
    mutationFn: () =>
      setClientProjects({ data: { userId, projectIds: selected } }),
    onSuccess: () => {
      toast.success("Acesso atualizado");
      onSaved();
      onClose();
    },
    onError: (error) => toast.error(getStandardErrorMessage(error)),
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Projetos liberados</DialogTitle>
          <DialogDescription>
            {email} vê só estes projetos, em modo leitura. Desmarcar tira o
            acesso na hora.
          </DialogDescription>
        </DialogHeader>
        <ProjectChecklist
          projects={projects}
          selected={selected}
          onChange={setSelected}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={save.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => save.mutate()} pending={save.isPending}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
