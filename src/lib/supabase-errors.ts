export type SupabaseMaybeError = {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
};

export function getScrimRegistrationErrorMessage(err: unknown): string {
  const e = (err ?? {}) as SupabaseMaybeError;
  const raw = String(e.message || "");
  const msg = raw.toLowerCase();

  // Common Postgres codes
  if (e.code === "23505") return "Sua equipe já está inscrita neste scrim.";
  if (e.code === "42501") return "Sem permissão para inscrever esta equipe.";

  // Our RPC may raise explicit identifiers in the message
  if (msg.includes("insufficient") || msg.includes("insufficient_funds") || msg.includes("saldo")) {
    return "Saldo insuficiente de TorneCoins para concluir a inscrição.";
  }

  if (msg.includes("full") || msg.includes("lotado") || msg.includes("max_slots")) {
    return "Este scrim já está lotado.";
  }

  if (msg.includes("private") || msg.includes("privado") || msg.includes("invited")) {
    return "Scrim privado: sua equipe não está na lista de convidados.";
  }

  if (msg.includes("not_team_admin") || msg.includes("team admin") || msg.includes("is_team_admin")) {
    return "Você precisa ser admin da equipe para inscrever.";
  }

  if (msg.includes("closed") || msg.includes("encerrad") || msg.includes("finalizado") || msg.includes("em andamento")) {
    return "As inscrições para este scrim estão encerradas.";
  }

  return e.message || "Erro ao inscrever equipe.";
}
