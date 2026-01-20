import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import OverlayTabelaGeral from "./OverlayTabelaGeral";

export default function OverlayQueda() {
  const [qs] = useSearchParams();
  const colsRaw = Number(qs.get("cols") || "1");
  const cols = colsRaw === 2 ? 2 : 1;

  // Reaproveita o mesmo renderer da tabela (ele já entende queda_id/rodada_id)
  // Aqui só garantimos que, por padrão, o usuário tende a usar 1 coluna.
  const nextQs = useMemo(() => {
    const next = new URLSearchParams(qs);
    if (!qs.get("cols")) next.set("cols", String(cols));
    return next;
  }, [qs, cols]);

  // Hack simples: renderiza o componente que lê do location.search (hook) —
  // então precisamos atualizar o URL real; mas como não vamos mexer no history aqui,
  // apenas retornamos o componente base e deixamos cols vir do próprio qs.
  // (O modal já manda cols.)
  void nextQs;

  return <OverlayTabelaGeral />;
}
