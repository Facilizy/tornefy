import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type FaqItemRow = {
  id: string;
  slug: string;
  language: string;
  audience: string;
  topic: string;
  question: string;
  answer: string;
  keywords: string[];
  active: boolean;
  sort_order: number;
  updated_at: string;
};

type FaqVideoRow = {
  id: string;
  slug: string;
  language: string;
  audience: string;
  topic: string;
  title: string;
  description: string;
  youtube_id: string;
  duration_seconds: number;
  active: boolean;
  sort_order: number;
  updated_at: string;
};

const LANGS = ["pt-BR", "en", "es"] as const;

export function FaqAdminTab() {
  const qc = useQueryClient();
  const [language, setLanguage] = useState<(typeof LANGS)[number]>("pt-BR");

  const itemsQuery = useQuery({
    queryKey: ["admin", "faq", "items", language],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faq_items")
        .select(
          "id, slug, language, audience, topic, question, answer, keywords, active, sort_order, updated_at",
        )
        .eq("language", language)
        .order("sort_order", { ascending: true })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FaqItemRow[];
    },
  });

  const videosQuery = useQuery({
    queryKey: ["admin", "faq", "videos", language],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faq_videos")
        .select(
          "id, slug, language, audience, topic, title, description, youtube_id, duration_seconds, active, sort_order, updated_at",
        )
        .eq("language", language)
        .order("sort_order", { ascending: true })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FaqVideoRow[];
    },
  });

  const items = itemsQuery.data ?? [];
  const videos = videosQuery.data ?? [];

  const baseUrlPreview = useMemo(() => `/faq/`, []);

  return (
    <section className="mt-4 space-y-4">
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="w-full sm:max-w-[220px]">
            <Label>Idioma</Label>
            <Input value={language} onChange={(e) => setLanguage(e.target.value as any)} list="faq-langs" />
            <datalist id="faq-langs">
              {LANGS.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <FaqItemDialog
              mode="create"
              language={language}
              triggerLabel="Nova pergunta"
              onDone={async () => qc.invalidateQueries({ queryKey: ["admin", "faq", "items", language] })}
            />
            <FaqVideoDialog
              mode="create"
              language={language}
              triggerLabel="Novo vídeo"
              onDone={async () => qc.invalidateQueries({ queryKey: ["admin", "faq", "videos", language] })}
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Links diretos (compartilháveis): {baseUrlPreview}
          <span className="font-mono">&lt;slug&gt;</span>
        </p>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">FAQ (texto)</h2>
          <div className="text-xs text-muted-foreground">{items.length} itens</div>
        </div>

        <div className="mt-3 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slug</TableHead>
                <TableHead>Pergunta</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.slug}</TableCell>
                  <TableCell className="max-w-[520px]">
                    <div className="text-sm font-medium line-clamp-1">{row.question}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {row.audience} • {row.topic} • ordem {row.sort_order}
                    </div>
                  </TableCell>
                  <TableCell>{row.active ? "sim" : "não"}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-2">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(`${baseUrlPreview}${row.slug}`);
                          toast.success("Link copiado");
                        }}
                      >
                        Copiar link
                      </Button>
                      <FaqItemDialog
                        mode="edit"
                        language={language}
                        triggerLabel="Editar"
                        initial={row}
                        onDone={async () => qc.invalidateQueries({ queryKey: ["admin", "faq", "items", language] })}
                      />
                      <Button
                        size="xs"
                        variant="destructive"
                        onClick={async () => {
                          if (!confirm("Remover este item do FAQ?")) return;
                          const { error } = await supabase.from("faq_items").delete().eq("id", row.id);
                          if (error) {
                            toast.error("Erro", { description: error.message });
                            return;
                          }
                          toast.success("Removido");
                          await qc.invalidateQueries({ queryKey: ["admin", "faq", "items", language] });
                        }}
                      >
                        Remover
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-sm text-muted-foreground py-6 text-center">
                    Nenhum item neste idioma.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">FAQ (vídeos)</h2>
          <div className="text-xs text-muted-foreground">{videos.length} vídeos</div>
        </div>

        <div className="mt-3 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Slug</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>YouTube</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {videos.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.slug}</TableCell>
                  <TableCell className="max-w-[520px]">
                    <div className="text-sm font-medium line-clamp-1">{row.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {row.audience} • {row.topic} • ordem {row.sort_order}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.youtube_id}</TableCell>
                  <TableCell>{row.active ? "sim" : "não"}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-2">
                      <FaqVideoDialog
                        mode="edit"
                        language={language}
                        triggerLabel="Editar"
                        initial={row}
                        onDone={async () => qc.invalidateQueries({ queryKey: ["admin", "faq", "videos", language] })}
                      />
                      <Button
                        size="xs"
                        variant="destructive"
                        onClick={async () => {
                          if (!confirm("Remover este vídeo do FAQ?")) return;
                          const { error } = await supabase.from("faq_videos").delete().eq("id", row.id);
                          if (error) {
                            toast.error("Erro", { description: error.message });
                            return;
                          }
                          toast.success("Removido");
                          await qc.invalidateQueries({ queryKey: ["admin", "faq", "videos", language] });
                        }}
                      >
                        Remover
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {videos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground py-6 text-center">
                    Nenhum vídeo neste idioma.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </Card>
    </section>
  );
}

function FaqItemDialog({
  mode,
  language,
  triggerLabel,
  initial,
  onDone,
}: {
  mode: "create" | "edit";
  language: string;
  triggerLabel: string;
  initial?: Partial<FaqItemRow>;
  onDone: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [audience, setAudience] = useState(initial?.audience ?? "player");
  const [topic, setTopic] = useState(initial?.topic ?? "getting-started");
  const [question, setQuestion] = useState(initial?.question ?? "");
  const [answer, setAnswer] = useState(initial?.answer ?? "");
  const [keywords, setKeywords] = useState((initial?.keywords ?? []).join(", "));
  const [sortOrder, setSortOrder] = useState(String(initial?.sort_order ?? 0));
  const [active, setActive] = useState(initial?.active ?? true);
  const isEdit = mode === "edit";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="xs" variant={isEdit ? "outline" : "default"}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar item" : "Novo item"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Slug (link)</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="ex: criar-time" />
            </div>
            <div>
              <Label>Ordem</Label>
              <Input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} inputMode="numeric" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Audience</Label>
              <Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="player|organizer" />
            </div>
            <div>
              <Label>Tópico</Label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="getting-started|teams|scrims|scoring|ranking|organizer"
              />
            </div>
          </div>

          <div>
            <Label>Pergunta</Label>
            <Input value={question} onChange={(e) => setQuestion(e.target.value)} />
          </div>

          <div>
            <Label>Resposta</Label>
            <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={7} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Keywords (separadas por vírgula)</Label>
              <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input id="faqitem-active" type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              <Label htmlFor="faqitem-active">Ativo</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                try {
                  const payload = {
                    slug: slug.trim(),
                    language,
                    audience: audience.trim(),
                    topic: topic.trim(),
                    question: question.trim(),
                    answer: answer.trim(),
                    keywords: keywords
                      .split(",")
                      .map((k) => k.trim())
                      .filter(Boolean),
                    active,
                    sort_order: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
                  };

                  if (!payload.slug || !payload.question || !payload.answer) {
                    toast.error("Preencha slug, pergunta e resposta");
                    return;
                  }

                  if (isEdit) {
                    const { error } = await supabase.from("faq_items").update(payload).eq("id", initial?.id);
                    if (error) throw error;
                  } else {
                    const { error } = await supabase.from("faq_items").insert(payload);
                    if (error) throw error;
                  }

                  toast.success("Salvo");
                  setOpen(false);
                  await onDone();
                } catch (e: any) {
                  toast.error("Erro", { description: e?.message ? String(e.message) : "Falha" });
                }
              }}
            >
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FaqVideoDialog({
  mode,
  language,
  triggerLabel,
  initial,
  onDone,
}: {
  mode: "create" | "edit";
  language: string;
  triggerLabel: string;
  initial?: Partial<FaqVideoRow>;
  onDone: () => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [audience, setAudience] = useState(initial?.audience ?? "player");
  const [topic, setTopic] = useState(initial?.topic ?? "getting-started");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [youtubeId, setYoutubeId] = useState(initial?.youtube_id ?? "");
  const [durationSeconds, setDurationSeconds] = useState(String(initial?.duration_seconds ?? 0));
  const [sortOrder, setSortOrder] = useState(String(initial?.sort_order ?? 0));
  const [active, setActive] = useState(initial?.active ?? true);
  const isEdit = mode === "edit";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="xs" variant={isEdit ? "outline" : "default"}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar vídeo" : "Novo vídeo"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Slug</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="ex: intro-player" />
            </div>
            <div>
              <Label>Ordem</Label>
              <Input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} inputMode="numeric" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Audience</Label>
              <Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="player|organizer" />
            </div>
            <div>
              <Label>Tópico</Label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="getting-started|teams|scrims|scoring|ranking|organizer"
              />
            </div>
          </div>

          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>YouTube ID</Label>
              <Input value={youtubeId} onChange={(e) => setYoutubeId(e.target.value)} placeholder="MFMhoNtTSdk" />
            </div>
            <div>
              <Label>Duração (segundos)</Label>
              <Input value={durationSeconds} onChange={(e) => setDurationSeconds(e.target.value)} inputMode="numeric" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input id="faqvideo-active" type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <Label htmlFor="faqvideo-active">Ativo</Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                try {
                  const payload = {
                    slug: slug.trim(),
                    language,
                    audience: audience.trim(),
                    topic: topic.trim(),
                    title: title.trim(),
                    description: description.trim(),
                    youtube_id: youtubeId.trim(),
                    duration_seconds: Number.isFinite(Number(durationSeconds)) ? Number(durationSeconds) : 0,
                    active,
                    sort_order: Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0,
                  };

                  if (!payload.slug || !payload.title || !payload.youtube_id) {
                    toast.error("Preencha slug, título e YouTube ID");
                    return;
                  }

                  if (isEdit) {
                    const { error } = await supabase.from("faq_videos").update(payload).eq("id", initial?.id);
                    if (error) throw error;
                  } else {
                    const { error } = await supabase.from("faq_videos").insert(payload);
                    if (error) throw error;
                  }

                  toast.success("Salvo");
                  setOpen(false);
                  await onDone();
                } catch (e: any) {
                  toast.error("Erro", { description: e?.message ? String(e.message) : "Falha" });
                }
              }}
            >
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
