import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "cn";

/** A change in count or position; positive is good. */
export function Delta({ value }: { value: number }) {
  if (value === 0) return null;
  const Icon = value > 0 ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        "inline-flex items-center text-[12px] font-medium",
        value > 0 ? "text-success" : "text-destructive",
      )}
    >
      <Icon className="size-3" />
      {Math.abs(value)}
    </span>
  );
}

export function formatDay(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}
