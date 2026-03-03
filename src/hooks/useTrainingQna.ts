import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TrainingQuestion = {
  id: string;
  training_id: string;
  author_id: string;
  question: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
};

export type TrainingAnswer = {
  id: string;
  question_id: string;
  author_id: string;
  answer: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
};

export function useTrainingQna(params: {
  trainingId: string | undefined;
  userId: string | undefined;
}) {
  const { trainingId, userId } = params;
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<TrainingQuestion[]>([]);
  const [answers, setAnswers] = useState<TrainingAnswer[]>([]);

  const answersByQuestionId = useMemo(() => {
    const m = new Map<string, TrainingAnswer[]>();
    for (const a of answers) {
      const arr = m.get(a.question_id) ?? [];
      arr.push(a);
      m.set(a.question_id, arr);
    }
    return m;
  }, [answers]);

  const refetch = useCallback(async () => {
    if (!trainingId) return;
    setLoading(true);
    try {
      const { data: qData, error: qErr } = await supabase
        .from("training_questions")
        .select("*")
        .eq("training_id", trainingId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (qErr) throw qErr;
      const qs = (qData ?? []) as any[];
      setQuestions(qs as TrainingQuestion[]);

      const qIds = qs.map((q) => String(q.id)).filter(Boolean);
      if (qIds.length === 0) {
        setAnswers([]);
        return;
      }

      const { data: aData, error: aErr } = await supabase
        .from("training_answers")
        .select("*")
        .in("question_id", qIds)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (aErr) throw aErr;
      setAnswers((aData ?? []) as any);
    } finally {
      setLoading(false);
    }
  }, [trainingId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const createQuestion = useCallback(
    async (text: string) => {
      if (!trainingId) throw new Error("Treino inválido");
      if (!userId) throw new Error("Sem sessão ativa");
      const question = text.trim();
      if (!question) throw new Error("Digite uma pergunta");

      const { error } = await supabase.from("training_questions").insert({
        training_id: trainingId,
        author_id: userId,
        question,
      } as any);
      if (error) throw error;
      await refetch();
    },
    [refetch, trainingId, userId],
  );

  const answerQuestion = useCallback(
    async (questionId: string, text: string) => {
      if (!userId) throw new Error("Sem sessão ativa");
      const answer = text.trim();
      if (!answer) throw new Error("Digite uma resposta");

      const { error } = await supabase.from("training_answers").insert({
        question_id: questionId,
        author_id: userId,
        answer,
      } as any);
      if (error) throw error;
      await refetch();
    },
    [refetch, userId],
  );

  const softDeleteQuestion = useCallback(
    async (questionId: string) => {
      if (!userId) throw new Error("Sem sessão ativa");
      const { error } = await supabase
        .from("training_questions")
        .update({ deleted_at: new Date().toISOString(), deleted_by: userId } as any)
        .eq("id", questionId);
      if (error) throw error;
      await refetch();
    },
    [refetch, userId],
  );

  const softDeleteAnswer = useCallback(
    async (answerId: string) => {
      if (!userId) throw new Error("Sem sessão ativa");
      const { error } = await supabase
        .from("training_answers")
        .update({ deleted_at: new Date().toISOString(), deleted_by: userId } as any)
        .eq("id", answerId);
      if (error) throw error;
      await refetch();
    },
    [refetch, userId],
  );

  return {
    loading,
    questions,
    answersByQuestionId,
    createQuestion,
    answerQuestion,
    softDeleteQuestion,
    softDeleteAnswer,
    refetch,
  };
}
