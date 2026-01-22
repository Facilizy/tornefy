import { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ResendInviteConfirmDialogProps = {
  trigger: ReactNode;
  targetLabel: string;
  messagePreview: string;
  onConfirm: () => void;
  confirmLabel?: string;
};

export function ResendInviteConfirmDialog({
  trigger,
  targetLabel,
  messagePreview,
  onConfirm,
  confirmLabel = "Reenviar",
}: ResendInviteConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reenviar convite?</AlertDialogTitle>
          <AlertDialogDescription>
            Você vai reenviar um convite para <span className="font-medium">{targetLabel}</span>.
            <span className="block mt-2 text-foreground">{messagePreview}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
