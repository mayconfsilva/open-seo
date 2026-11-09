import { useState, type FormEvent } from "react";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import { Textarea } from "@/client/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/client/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";
import type { TaskInput } from "./actionPlanQueries";

const NO_KEYWORD = "none";

/** Create or edit one task of the action plan. */
export function TaskDialog({
  title,
  initial,
  keywords,
  pending,
  onSubmit,
  onClose,
}: {
  title: string;
  initial?: Partial<TaskInput>;
  keywords: Array<{ id: string; keyword: string }>;
  pending: boolean;
  onSubmit: (input: TaskInput) => void;
  onClose: () => void;
}) {
  const [taskTitle, setTaskTitle] = useState(initial?.title ?? "");
  const [reason, setReason] = useState(initial?.reason ?? "");
  const [keywordId, setKeywordId] = useState(
    initial?.trackingKeywordId ?? NO_KEYWORD,
  );
  const [pageUrl, setPageUrl] = useState(initial?.pageUrl ?? "");
  const [assignee, setAssignee] = useState(initial?.assignee ?? "");
  const keywordItems = [
    { value: NO_KEYWORD, label: "Nenhuma" },
    ...keywords.map((kw) => ({ value: kw.id, label: kw.keyword })),
  ];

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (taskTitle.trim() === "") return;
    onSubmit({
      title: taskTitle.trim(),
      reason: reason.trim() || null,
      trackingKeywordId: keywordId === NO_KEYWORD ? null : keywordId,
      pageUrl: pageUrl.trim() || null,
      assignee: assignee.trim() || null,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <Field label="O que fazer" id="task-title">
            <Input
              id="task-title"
              value={taskTitle}
              placeholder="Ex.: Reescrever o título da página de instalação"
              onChange={(event) => setTaskTitle(event.target.value)}
              autoFocus
            />
          </Field>
          <Field label="Por quê" id="task-reason">
            <Textarea
              id="task-reason"
              value={reason}
              rows={3}
              placeholder="O que foi observado e o que se espera"
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Palavra ligada" id="task-keyword">
              <Select
                items={keywordItems}
                value={keywordId}
                onValueChange={(value) => setKeywordId(value ?? NO_KEYWORD)}
              >
                <SelectTrigger id="task-keyword" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {keywordItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Página" id="task-page">
              <Input
                id="task-page"
                value={pageUrl}
                placeholder="/servicos/instalacao"
                onChange={(event) => setPageUrl(event.target.value)}
              />
            </Field>
          </div>
          <Field label="Responsável" id="task-assignee">
            <Input
              id="task-assignee"
              value={assignee}
              placeholder="Nome de quem vai fazer"
              onChange={(event) => setAssignee(event.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              pending={pending}
              disabled={taskTitle.trim() === ""}
            >
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
