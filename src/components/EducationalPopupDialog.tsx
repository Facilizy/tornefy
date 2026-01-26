import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { EducationalPopup } from "@/hooks/useEducationalPopups";

export function EducationalPopupDialog({
  open,
  onOpenChange,
  popup,
  onCta,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  popup: EducationalPopup;
  onCta: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold">{popup.title}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          {popup.svg_markup ? (
            <div className="rounded-xl border border-border bg-card/50 p-3">
              <div
                className="w-full max-h-[260px] overflow-hidden [&_svg]:w-full [&_svg]:h-auto"
                // Admin-controlled content
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: popup.svg_markup }}
              />
            </div>
          ) : null}

          {popup.description ? <p className="text-sm text-muted-foreground">{popup.description}</p> : null}

          <div className="flex items-center justify-end gap-2">
            <Button onClick={onCta}>{popup.cta_label || "Entendi"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
