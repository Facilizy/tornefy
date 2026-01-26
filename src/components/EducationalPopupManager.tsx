import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useEducationalPopups } from "@/hooks/useEducationalPopups";
import { EducationalPopupDialog } from "@/components/EducationalPopupDialog";

export function EducationalPopupManager({ userId }: { userId?: string | null }) {
  const { popup, dismiss, error } = useEducationalPopups(userId);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (popup?.id) setOpen(true);
  }, [popup?.id]);

  useEffect(() => {
    if (error) toast.error("Falha ao carregar popups");
  }, [error]);

  if (!userId || !popup) return null;

  return (
    <EducationalPopupDialog
      open={open}
      onOpenChange={setOpen}
      popup={popup}
      onCta={async () => {
        try {
          await dismiss(popup.id);
          setOpen(false);
        } catch (e: any) {
          toast.error(e?.message ? String(e.message) : "Falha ao salvar");
        }
      }}
    />
  );
}
