import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ActionTile({
  title,
  description,
  icon: Icon,
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  title: string;
  description?: string;
  icon: LucideIcon;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "group relative w-full rounded-2xl border bg-card/50 p-4 text-left transition-all",
        "border-border hover:-translate-y-0.5 hover:bg-card/70",
        "hover:border-[hsl(var(--event-accent)/0.55)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--event-accent)/0.45)] focus-visible:ring-offset-2",
        active ? "ring-1 ring-[hsl(var(--event-accent)/0.35)]" : "",
        className,
      )}
      {...props}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
            "border-border bg-background/50 transition-colors group-hover:bg-background/70",
            "group-hover:border-[hsl(var(--event-accent)/0.35)]",
          )}
        >
          <Icon className="h-5 w-5 text-[hsl(var(--event-accent))]" />
        </div>

        <div className="min-w-0">
          <div className="text-sm font-black uppercase tracking-wide text-foreground">{title}</div>
          {description ? (
            <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</div>
          ) : null}
        </div>
      </div>
    </button>
  );
}
