import { useMemo, useState, useEffect, type ComponentType } from "react";
import { Link } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getCanonicalOrigin, setJsonLd, setSeo } from "@/lib/seo";
import { z } from "zod";
import { Play, FileText, Search, Sparkles, Users, Trophy, Shield } from "lucide-react";
import { YouTubeTutorialPlayer } from "@/components/faq/YouTubeTutorialPlayer";
import { useI18n } from "@/i18n";
import { getFaqContent, type FaqAudience, type FaqItem, type FaqTopic, type VideoItem } from "@/pages/faq/content";

const searchSchema = z
  .string()
  .transform((v) => v.trim())
  .pipe(z.string().max(60));

const TOPIC_ORDER: FaqTopic[] = [
  "getting-started",
  "teams",
  "scrims",
  "scoring",
  "ranking",
  "organizer",
];

const topicIcon: Record<FaqTopic, ComponentType<{ className?: string }>> = {
  "getting-started": Sparkles,
  teams: Users,
  scrims: Shield,
  scoring: Shield,
  ranking: Trophy,
  organizer: Users,
};

export default function FAQ() {
  const { language } = useI18n();
  const { copy, items: FAQ_ITEMS, videos: VIDEO_ITEMS } = useMemo(
    () => getFaqContent(language),
    [language]
  );

  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<"text" | "videos">("text");
  const [audienceFilter, setAudienceFilter] = useState<"all" | FaqAudience>("all");
  const [topicFilter, setTopicFilter] = useState<FaqTopic | "all">("all");
  const [watchedSeconds, setWatchedSeconds] = useState<Record<string, number>>({});
  const [videoDurations, setVideoDurations] = useState<Record<string, number>>({});
  const [openText, setOpenText] = useState<string[]>([]);

  useEffect(() => {
    setSeo({
      title: copy.pageTitle,
      description:
        copy.heroSubtitle,
      canonical: `${getCanonicalOrigin()}/faq`,
    });

    const origin = getCanonicalOrigin();
    setJsonLd("breadcrumbs-faq", {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: origin + "/" },
        { "@type": "ListItem", position: 2, name: "FAQ", item: origin + "/faq" },
      ],
    });

    setJsonLd("faqpage", {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ_ITEMS.map((it) => ({
        "@type": "Question",
        name: it.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: it.answer,
        },
      })),
    });
  }, [copy.pageTitle, copy.heroSubtitle, FAQ_ITEMS]);

  useEffect(() => {
    const stored = localStorage.getItem("tornefy_video_progress");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Record<string, number>;
        setWatchedSeconds(parsed);
      } catch {
        // ignore parse error
      }
    }
  }, []);

  const safeQuery = useMemo(() => {
    const parsed = searchSchema.safeParse(query);
    return parsed.success ? parsed.data : "";
  }, [query]);

  const filtered = useMemo(() => {
    let base = FAQ_ITEMS;
    if (audienceFilter !== "all") {
      base = base.filter((it) => it.audience === audienceFilter);
    }
    if (topicFilter !== "all") {
      base = base.filter((it) => it.topic === topicFilter);
    }
    if (!safeQuery) return base;
    const q = safeQuery.toLowerCase();
    return base.filter((it) => {
      const hay = `${it.question} ${it.answer} ${it.keywords.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [safeQuery, audienceFilter, topicFilter, FAQ_ITEMS]);

  const filteredVideos = useMemo(() => {
    let base = VIDEO_ITEMS;
    if (audienceFilter !== "all") {
      base = base.filter((v) => v.audience === audienceFilter);
    }
    if (topicFilter !== "all") {
      base = base.filter((v) => v.topic === topicFilter);
    }
    if (!safeQuery) return base;
    const q = safeQuery.toLowerCase();
    return base.filter((v) => {
      const hay = `${v.title} ${v.description}`.toLowerCase();
      return hay.includes(q);
    });
  }, [safeQuery, audienceFilter, topicFilter, VIDEO_ITEMS]);

  const groupedByTopic = useMemo(() => {
    const groups = new Map<FaqTopic, FaqItem[]>();
    TOPIC_ORDER.forEach((t) => groups.set(t, []));
    filtered.forEach((it) => groups.get(it.topic)?.push(it));
    return groups;
  }, [filtered]);

  const counts = useMemo(() => {
    const byAudience: Record<"all" | FaqAudience, number> = {
      all: FAQ_ITEMS.length,
      player: FAQ_ITEMS.filter((i) => i.audience === "player").length,
      organizer: FAQ_ITEMS.filter((i) => i.audience === "organizer").length,
    };
    const byTopic: Record<string, number> = { all: FAQ_ITEMS.length };
    for (const t of TOPIC_ORDER) {
      byTopic[t] = FAQ_ITEMS.filter((i) => i.topic === t).length;
    }
    return { byAudience, byTopic };
  }, [FAQ_ITEMS]);

  const activeTopics = useMemo(() => {
    // Only show topics that have something under current audience filter.
    const base = audienceFilter === "all" ? FAQ_ITEMS : FAQ_ITEMS.filter((i) => i.audience === audienceFilter);
    const set = new Set<FaqTopic>();
    base.forEach((i) => set.add(i.topic));
    return TOPIC_ORDER.filter((t) => set.has(t));
  }, [FAQ_ITEMS, audienceFilter]);

  const handleVideoProgress = (videoId: string, seconds: number, duration?: number) => {
    setWatchedSeconds((prev) => {
      const updated = { ...prev, [videoId]: seconds };
      localStorage.setItem("tornefy_video_progress", JSON.stringify(updated));
      return updated;
    });
    if (typeof duration === "number" && Number.isFinite(duration) && duration > 0) {
      setVideoDurations((prev) => ({ ...prev, [videoId]: duration }));
    }
  };

  return (
    <MainLayout showUpcomingScrimWidget={false}>
      <main className="container mx-auto px-4 py-8">
        <header className="mb-6">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur p-5 sm:p-6">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/16 via-transparent to-transparent" />
            <div className="relative">
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">{copy.heroTitle}</h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
                {copy.heroSubtitle}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm" className="rounded-full">
                  <Link to="/scrims">{copy.ctaScrims}</Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="rounded-full">
                  <Link to="/my-team">{copy.ctaMyTeam}</Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="rounded-full">
                  <Link to="/organizer">{copy.ctaOrganizer}</Link>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <Card className="p-5 bg-card/60 border-border backdrop-blur mb-6">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
            <TabsList className="bg-card/50 mb-4 w-full sm:w-auto">
              <TabsTrigger value="text" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {copy.viewText}
              </TabsTrigger>
              <TabsTrigger value="videos" className="flex items-center gap-2">
                <Play className="w-4 h-4" />
                {copy.viewVideos}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="faq-search" className="text-xs text-muted-foreground uppercase tracking-wide">
                {copy.searchLabel}
              </Label>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="faq-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={viewMode === "text" ? copy.searchPlaceholderText : copy.searchPlaceholderVideos}
                  inputMode="search"
                  autoComplete="off"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant={audienceFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setAudienceFilter("all")}
                className="rounded-full"
              >
                {copy.audienceAll}
                <span className="ml-1 text-xs opacity-80">({counts.byAudience.all})</span>
              </Button>
              <Button
                variant={audienceFilter === "player" ? "default" : "outline"}
                size="sm"
                onClick={() => setAudienceFilter("player")}
                className="rounded-full"
              >
                {copy.audiencePlayer}
                <span className="ml-1 text-xs opacity-80">({counts.byAudience.player})</span>
              </Button>
              <Button
                variant={audienceFilter === "organizer" ? "default" : "outline"}
                size="sm"
                onClick={() => setAudienceFilter("organizer")}
                className="rounded-full"
              >
                {copy.audienceOrganizer}
                <span className="ml-1 text-xs opacity-80">({counts.byAudience.organizer})</span>
              </Button>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{copy.topicsLabel}</p>
                <Button
                  variant="ghost"
                  size="xs"
                  className="h-7"
                  onClick={() => {
                    setQuery("");
                    setAudienceFilter("all");
                    setTopicFilter("all");
                  }}
                >
                  Limpar
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant={topicFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTopicFilter("all")}
                  className="rounded-full"
                >
                  {copy.topicAll}
                  <span className="ml-1 text-xs opacity-80">({counts.byTopic.all})</span>
                </Button>

                {activeTopics.map((t) => {
                  const Icon = topicIcon[t];
                  return (
                    <Button
                      key={t}
                      variant={topicFilter === t ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTopicFilter(t)}
                      className="rounded-full"
                    >
                      <Icon className="h-4 w-4" />
                      {copy.topics[t]}
                      <span className="ml-1 text-xs opacity-80">({counts.byTopic[t] ?? 0})</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        {viewMode === "text" ? (
          <Card className="p-5 bg-card/60 border-border backdrop-blur">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">
                {copy.noResultsText}
              </p>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Card className="p-3 bg-background/40 border-border">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">FAQ</p>
                    <p className="text-lg font-black leading-none">{FAQ_ITEMS.length}</p>
                  </Card>
                  <Card className="p-3 bg-background/40 border-border">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Vídeos</p>
                    <p className="text-lg font-black leading-none">{VIDEO_ITEMS.length}</p>
                  </Card>
                  <Card className="p-3 bg-background/40 border-border">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{copy.audiencePlayer}</p>
                    <p className="text-lg font-black leading-none">{counts.byAudience.player}</p>
                  </Card>
                  <Card className="p-3 bg-background/40 border-border">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{copy.audienceOrganizer}</p>
                    <p className="text-lg font-black leading-none">{counts.byAudience.organizer}</p>
                  </Card>
                </div>

                <Accordion
                  type="multiple"
                  className="w-full"
                  value={openText}
                  onValueChange={(v) => setOpenText(v as string[])}
                >
                  {TOPIC_ORDER.map((topic) => {
                    const list = groupedByTopic.get(topic) || [];
                    if (list.length === 0) return null;
                    const Icon = topicIcon[topic];
                    return (
                      <section key={topic} className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="text-sm font-black uppercase tracking-wide flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            {copy.topics[topic]}
                          </h2>
                          <span className="text-xs text-muted-foreground">{list.length}</span>
                        </div>

                        <div className="rounded-xl border border-border bg-background/30">
                          {list.map((it, idx) => (
                            <AccordionItem
                              key={it.id}
                              value={it.id}
                              className={idx === 0 ? "border-t-0" : undefined}
                            >
                              <AccordionTrigger className="text-left px-4">
                                <span className="flex items-center gap-2">
                                  <span
                                    className={
                                      it.audience === "organizer" ? "text-muted-foreground" : "text-muted-foreground"
                                    }
                                  >
                                    {it.audience === "organizer" ? "•" : "•"}
                                  </span>
                                  {it.question}
                                </span>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="px-4 pb-4 text-sm text-muted-foreground whitespace-pre-wrap">
                                  {it.answer}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </Accordion>
              </div>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredVideos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 col-span-full">
                Nenhum vídeo encontrado. Tente ajustar os filtros.
              </p>
            ) : (
              filteredVideos.map((video) => {
                const watched = watchedSeconds[video.id] || 0;
                const duration = videoDurations[video.id] || video.durationSeconds;
                const progress = duration > 0 ? (watched / duration) * 100 : 0;
                return (
                  <Card key={video.id} className="overflow-hidden bg-card/60 border-border backdrop-blur">
                    <div className="aspect-video bg-muted relative">
                      <YouTubeTutorialPlayer
                        videoId={video.youtubeId}
                        startSeconds={watched > 3 ? watched - 2 : 0}
                        className="absolute inset-0"
                        onProgress={({ currentTime, duration }) =>
                          handleVideoProgress(video.id, Math.floor(currentTime), duration)
                        }
                      />
                    </div>
                    <div className="p-4">
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {video.audience === "player" ? copy.audiencePlayer : copy.audienceOrganizer} • {copy.topics[video.topic]}
                      </p>
                      <h3 className="font-semibold text-lg mb-2">{video.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{video.description}</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Progresso</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div
                            className="bg-primary h-1.5 rounded-full transition-all"
                            style={{ width: `${Math.min(100, progress)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </main>
    </MainLayout>
  );
}
