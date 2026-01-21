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
    return "border-status-open/30 bg-status-open/15 text-status-open";
  }
  if (s === "INSCRIÇÕES ENCERRADAS") {
    return "border-status-closed/30 bg-status-closed/15 text-status-closed";
  }
  if (s === "EM ANDAMENTO") {
    return "border-status-live/30 bg-status-live/15 text-status-live";
  }
  if (s === "FINALIZADO") {
    return "border-status-done/30 bg-status-done/15 text-status-done";
  }

  // fallback
  return "border-border bg-muted/40 text-foreground";
}
