import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SupportedLanguage } from "@/i18n";
import type { FaqAudience, FaqTopic } from "@/pages/faq/content";

export type FaqDbItem = {
  id: string;
  slug: string;
  language: string;
  audience: FaqAudience;
  topic: FaqTopic;
  question: string;
  answer: string;
  keywords: string[];
  active: boolean;
  sort_order: number;
};

export type FaqDbVideo = {
  id: string;
  slug: string;
  language: string;
  audience: FaqAudience;
  topic: FaqTopic;
  title: string;
  description: string;
  youtube_id: string;
  duration_seconds: number;
  active: boolean;
  sort_order: number;
};

async function fetchFaqDb(language: SupportedLanguage) {
  const [itemsRes, videosRes] = await Promise.all([
    supabase
      .from("faq_items")
      .select("id, slug, language, audience, topic, question, answer, keywords, active, sort_order")
      .eq("language", language)
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("faq_videos")
      .select(
        "id, slug, language, audience, topic, title, description, youtube_id, duration_seconds, active, sort_order",
      )
      .eq("language", language)
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (itemsRes.error) throw itemsRes.error;
  if (videosRes.error) throw videosRes.error;

  return {
    items: (itemsRes.data ?? []) as unknown as FaqDbItem[],
    videos: (videosRes.data ?? []) as unknown as FaqDbVideo[],
  };
}

export function useFaqDbContent(language: SupportedLanguage) {
  return useQuery({
    queryKey: ["faq", "db", language],
    queryFn: () => fetchFaqDb(language),
    staleTime: 60_000,
  });
}
