import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ExternalTeamsImportStepper({ step }: { step: 1 | 2 | 3 }) {
  const items: Array<{ n: 1 | 2 | 3; label: string }> = [
    { n: 1, label: "Prompt" },
    { n: 2, label: "JSON" },
    { n: 3, label: "Revisão" },
  ];

  return (
    <div className="flex items-center gap-2">
      {items.map((it, idx) => {
        const active = it.n === step;
        const done = it.n < step;
        return (
          <div key={it.n} className="flex items-center gap-2">
            <Badge
              variant={active ? "default" : done ? "secondary" : "outline"}
              className={cn("gap-2", active && "shadow-sm")}
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-background/30 text-[11px] font-bold">
                {it.n}
              </span>
              <span className="hidden sm:inline">{it.label}</span>
            </Badge>
            {idx < items.length - 1 ? <div className="h-px w-6 bg-border" /> : null}
          </div>
        );
      })}
    </div>
  );
}
