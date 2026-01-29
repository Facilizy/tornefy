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
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <div className="grid gap-5 p-6 animate-enter">
          {/* título */}
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-extrabold leading-tight tracking-tight">
              {popup.title}
            </DialogTitle>
          </DialogHeader>

          {/* imagem */}
          {popup.svg_markup ? (
            <div className="rounded-2xl border border-border bg-card/60 p-4 shadow-sm">
              <div
                className={
                  "flex w-full justify-center items-center overflow-hidden " +
                  "[&_svg]:block [&_svg]:mx-auto [&_svg]:max-w-full [&_svg]:max-h-[240px] [&_svg]:w-auto [&_svg]:h-auto"
                }
                // Admin-controlled content
                // eslint-disable-next-line react/no-danger
                dangerouslySetInnerHTML={{ __html: popup.svg_markup }}
              />
            </div>
          ) : null}

          {/* texto */}
          {popup.description ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {popup.description}
            </p>
          ) : null}

          {/* botão */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button onClick={onCta} className="hover-scale">
              {popup.cta_label || "Entendi"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
