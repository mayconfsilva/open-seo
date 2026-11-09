import { useState, type FormEvent } from "react";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Label } from "@/client/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/client/components/ui/dialog";

/** One-field dialog for naming a group or setting a target page. */
export function TextDialog({
  title,
  description,
  label,
  placeholder,
  submitLabel,
  allowEmpty = false,
  pending,
  onSubmit,
  onClose,
}: {
  title: string;
  description: string;
  label: string;
  placeholder: string;
  submitLabel: string;
  allowEmpty?: boolean;
  pending: boolean;
  onSubmit: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!allowEmpty && value.trim() === "") return;
    onSubmit(value.trim());
  };
  return (
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="keyword-organize-input">{label}</Label>
            <Input
              id="keyword-organize-input"
              value={value}
              placeholder={placeholder}
              onChange={(event) => setValue(event.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              pending={pending}
              disabled={!allowEmpty && value.trim() === ""}
            >
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
