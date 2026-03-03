import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getGameLabel } from "@/lib/games";

export function GameAccountRequiredDialog({
  open,
  onOpenChange,
  gameId,
  missingCount,
  onGoIntegrations,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  missingCount: number;
  onGoIntegrations: () => void;
}) {
  const gameLabel = getGameLabel(gameId);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Vincule a conta do jogo</AlertDialogTitle>
          <AlertDialogDescription>
            Para se inscrever, todos os jogadores da line precisam ter o Nick vinculado para{" "}
            <span className="font-semibold text-foreground">{gameLabel}</span>. Encontramos{" "}
            <span className="font-semibold text-foreground">{missingCount}</span> pendência(s).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={() => {
              onOpenChange(false);
              onGoIntegrations();
            }}
          >
            Ir para Contas e integrações
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
