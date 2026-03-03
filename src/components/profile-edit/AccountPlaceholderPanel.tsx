import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AccountPlaceholderPanel({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className={cn("p-5 bg-card/40 border-border", className)}>
      <h2 className="text-lg font-black uppercase">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}

      <div className="mt-4 rounded-xl border border-border bg-background/20 p-4">
        <p className="text-sm font-semibold">Em breve</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta área já está preparada no layout. Quando você decidir a regra/fluxo, a gente implementa.
        </p>
        {children ? <div className="mt-3">{children}</div> : null}
      </div>
    </Card>
  );
}
