import { useMemo, useState, type CSSProperties } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { MessageCircle, Send, Trash2 } from "lucide-react";

import { useTrainingQna, type TrainingAnswer, type TrainingQuestion } from "@/hooks/useTrainingQna";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { hexToHslTriplet } from "@/lib/color";

type Props = {
  trainingId: string;
  userId?: string;
  canAnswer: boolean;
  canModerate: boolean;
  /** Hex color (e.g. #9146FF). When provided, the whole section inherits it as --primary. */
  primaryColor?: string | null;
};

export function TrainingQnaSection({ trainingId, userId, canAnswer, canModerate, primaryColor }: Props) {
  const qna = useTrainingQna({ trainingId, userId });
  const [draft, setDraft] = useState("");
  const [answerDraftByQid, setAnswerDraftByQid] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const total = qna.questions.length;

  const canAsk = !!userId;

  const onAsk = async () => {
    try {
      setBusyKey("ask");
      await qna.createQuestion(draft);
      setDraft("");
      toast.success("Pergunta enviada");
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível enviar");
    } finally {
      setBusyKey(null);
    }
  };

  const onAnswer = async (qid: string) => {
    try {
      setBusyKey(`answer:${qid}`);
      await qna.answerQuestion(qid, answerDraftByQid[qid] ?? "");
      setAnswerDraftByQid((s) => ({ ...s, [qid]: "" }));
      toast.success("Resposta publicada");
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível responder");
    } finally {
      setBusyKey(null);
    }
  };

  const onDeleteQuestion = async (q: TrainingQuestion) => {
    if (!confirm("Remover esta pergunta?")) return;
    try {
      setBusyKey(`delq:${q.id}`);
      await qna.softDeleteQuestion(q.id);
      toast.success("Pergunta removida");
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível remover");
    } finally {
      setBusyKey(null);
    }
  };

  const onDeleteAnswer = async (a: TrainingAnswer) => {
    if (!confirm("Remover esta resposta?")) return;
    try {
      setBusyKey(`dela:${a.id}`);
      await qna.softDeleteAnswer(a.id);
      toast.success("Resposta removida");
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível remover");
    } finally {
      setBusyKey(null);
    }
  };

  const subtitle = useMemo(() => {
    if (qna.loading) return "Carregando…";
    if (total === 0) return "Seja o primeiro a perguntar.";
    return `${total} pergunta${total === 1 ? "" : "s"}`;
  }, [qna.loading, total]);

  const localPrimary = useMemo(() => {
    try {
      return primaryColor ? hexToHslTriplet(primaryColor) : null;
    } catch {
      return null;
    }
  }, [primaryColor]);

  const style = useMemo(() => {
    if (!localPrimary) return undefined;
    return { ["--primary" as any]: localPrimary } as CSSProperties;
  }, [localPrimary]);

  return (
    <Card className="p-6 bg-card/80 border-border" style={style}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Perguntas & Respostas
          </h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <Separator className="my-4" />

      <div className="space-y-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={canAsk ? "Pergunte algo sobre o treino…" : "Faça login para enviar perguntas."}
          disabled={!canAsk || busyKey === "ask"}
          className="min-h-[92px]"
        />
        <div className="flex justify-end">
          <Button onClick={onAsk} disabled={!canAsk || busyKey === "ask"} className="gap-2">
            <Send className="h-4 w-4" />
            Enviar pergunta
          </Button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {qna.questions.map((q) => {
          const ans = qna.answersByQuestionId.get(q.id) ?? [];
          const canDeleteQ = !!userId && (q.author_id === userId || canModerate);

          return (
            <div key={q.id} className="rounded-xl border bg-background/50">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">Pergunta</div>
                    <div className="mt-1 text-sm text-foreground whitespace-pre-wrap break-words">{q.question}</div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {formatDistanceToNowStrict(new Date(q.created_at), { addSuffix: true, locale: ptBR })}
                    </div>
                  </div>

                  {canDeleteQ ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => onDeleteQuestion(q)}
                      disabled={busyKey === `delq:${q.id}`}
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>

              {ans.length > 0 ? (
                <div className="border-t">
                  <div className="p-4 space-y-3">
                    {ans.map((a) => {
                      const canDeleteA = !!userId && (a.author_id === userId || canModerate);
                      return (
                        <div key={a.id} className="rounded-lg border bg-card p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-muted-foreground">Resposta</div>
                              <div className="mt-1 text-sm whitespace-pre-wrap break-words">{a.answer}</div>
                              <div className="mt-2 text-xs text-muted-foreground">
                                {formatDistanceToNowStrict(new Date(a.created_at), { addSuffix: true, locale: ptBR })}
                              </div>
                            </div>
                            {canDeleteA ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => onDeleteAnswer(a)}
                                disabled={busyKey === `dela:${a.id}`}
                                title="Remover"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {canAnswer ? (
                <div className={cn("border-t", ans.length === 0 && "")}
                >
                  <div className="p-4 space-y-3">
                    <Textarea
                      value={answerDraftByQid[q.id] ?? ""}
                      onChange={(e) => setAnswerDraftByQid((s) => ({ ...s, [q.id]: e.target.value }))}
                      placeholder="Responder…"
                      className="min-h-[84px]"
                      disabled={busyKey === `answer:${q.id}`}
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={() => onAnswer(q.id)}
                        disabled={busyKey === `answer:${q.id}`}
                        className="gap-2"
                      >
                        <Send className="h-4 w-4" />
                        Responder
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
