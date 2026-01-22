export type TrainingStatusKey =
  | "INSCRIÇÕES ABERTAS"
  | "INSCRIÇÕES ENCERRADAS"
  | "EM ANDAMENTO"
  | "FINALIZADO";

function normalizeStatus(status?: string | null): string {
  return (status || "INSCRIÇÕES ABERTAS").trim().toUpperCase();
}

export function getTrainingStatusClasses(status?: string | null) {
  const s = normalizeStatus(status);

  if (s === "INSCRIÇÕES ABERTAS") {
    // Mais presente/legível sobre fundos roxos do tema
    return "border-status-open/50 bg-status-open/80 text-foreground";
  }
  if (s === "INSCRIÇÕES ENCERRADAS") {
    return "border-status-closed/50 bg-status-closed/80 text-foreground";
  }
  if (s === "EM ANDAMENTO") {
    return "border-status-live/50 bg-status-live/80 text-foreground";
  }
  if (s === "FINALIZADO") {
    return "border-status-done/50 bg-status-done/80 text-foreground";
  }

  // fallback
  return "border-border bg-muted/40 text-foreground";
}
