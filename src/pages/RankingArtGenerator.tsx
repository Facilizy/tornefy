import { useEffect, useMemo, useRef, useState, type WheelEventHandler } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import type { RankingArtFormat, TeamRankRow } from "@/components/ranking-art/types";
import { setSeo, getCanonicalOrigin } from "@/lib/seo";
import { ArrowLeft, Download, GalleryHorizontalEnd, ImageOff, Loader2, Monitor, Save, Sparkles, Trash2, Trophy } from "lucide-react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { EditorCanvas } from "@/components/ranking-editor/EditorCanvas";
import { createDefaultDocument } from "@/components/ranking-editor/defaults";
import type { EditorDocument, EditorElement, RankingTableColumn } from "@/components/ranking-editor/types";
import { CanvasSettingsPanel } from "@/components/ranking-editor/CanvasSettingsPanel";
import { CanvaLeftSidebar } from "@/components/ranking-editor/CanvaLeftSidebar";
import { Slider } from "@/components/ui/slider";
import { LeftDock } from "@/components/ranking-editor/LeftDock";
import { UploadsGalleryPanel } from "@/components/ranking-editor/UploadsGalleryPanel";
import { LayersPanel } from "@/components/ranking-editor/LayersPanel";
import { CanvaTopBar } from "@/components/ranking-editor/CanvaTopBar";
import { PropertiesPanel } from "@/components/ranking-editor/PropertiesPanel";
import { useIsMobile } from "@/hooks/use-mobile";

const FORMAT_LABEL: Record<RankingArtFormat, string> = {
  stories: "Story (9:16)",
  feed: "Post (1:1)",
  overlay: "Overlay (16:9)",
};

export default function RankingArtGenerator() {
  const navigate = useNavigate();
  const { trainingId } = useParams();
  const isMobile = useIsMobile();
  const [user, setUser] = useState<any>(null);
  const { role, loading: roleLoading } = useUserRole(user?.id);

  const [format, setFormat] = useState<RankingArtFormat>("stories");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [training, setTraining] = useState<any>(null);
  const [rows, setRows] = useState<TeamRankRow[]>([]);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  const [doc, setDoc] = useState<EditorDocument | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState<number>(0.5);
  const [past, setPast] = useState<EditorDocument[]>([]);
  const [future, setFuture] = useState<EditorDocument[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateName, setTemplateName] = useState<string>("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [showGuides, setShowGuides] = useState(true);
  const [showDocks, setShowDocks] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [exportMode, setExportMode] = useState(false);

  const [dockTab, setDockTab] = useState<string>("elements");

  const THEME_CATEGORIES = useMemo(
    () =>
      [
        { id: "gold", label: "Gold", primary: "#f59e0b", secondary: "#f97316" },
        { id: "purple", label: "Purple", primary: "#7c3aed", secondary: "#a855f7" },
        { id: "cyan", label: "Cyan", primary: "#06b6d4", secondary: "#22c55e" },
        { id: "red", label: "Red", primary: "#ef4444", secondary: "#f97316" },
        { id: "mono", label: "Mono", primary: "#94a3b8", secondary: "#e2e8f0" },
      ],
    [],
  );
  const [themeCategoryId, setThemeCategoryId] = useState<string>(THEME_CATEGORIES[1]?.id ?? "purple");

  const draftKey = useMemo(() => {
    const tid = trainingId || "unknown";
    return `tornefy:ranking-art:draft:${tid}:${format}`;
  }, [format, trainingId]);

  const saveDraft = () => {
    if (!doc) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(doc));
      toast.success("Rascunho salvo (neste navegador)");
    } catch (e: any) {
      toast.error(e?.message ? String(e.message) : "Falha ao salvar rascunho");
    }
  };

  const readDraft = (): EditorDocument | null => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed as EditorDocument;
    } catch {
      return null;
    }
  };

  // Preferências atuais: sem logo extra no topo do canvas e tabela sem bordas/gaps por padrão.
  const normalizeDoc = (d: EditorDocument): EditorDocument => {
    return {
      ...d,
      elements: (d.elements || [])
        // remove a "segunda" logo (elemento brand_mark) quando existir em drafts/templates antigos
        .filter((el) => el.type !== "brand_mark")
        .map((el) => {
          if (el.type !== "ranking_table") return el;
          return {
            ...el,
            rowTextColor: typeof (el as any).rowTextColor === "string" ? (el as any).rowTextColor : "#ffffff",
            rowGap: typeof (el as any).rowGap === "number" ? (el as any).rowGap : 0,
            cornerRadius: typeof (el as any).cornerRadius === "number" ? (el as any).cornerRadius : 0,
            rowBorderWidth: typeof (el as any).rowBorderWidth === "number" ? (el as any).rowBorderWidth : 0,
            accentBarWidth: typeof (el as any).accentBarWidth === "number" ? (el as any).accentBarWidth : 0,
          } as any;
        }),
    };
  };

  const applyThemeCategory = (categoryId: string) => {
    if (!doc) return;
    const cat = THEME_CATEGORIES.find((c) => c.id === categoryId);
    if (!cat) return;

    const before = doc;
    const after: EditorDocument = {
      ...doc,
      background: {
        ...doc.background,
        kind: "solid",
        solidColor: "#000000",
        primaryColor: cat.primary,
        secondaryColor: cat.secondary,
      },
      elements: doc.elements.map((el) => {
        if (el.type !== "ranking_table") return el;
        return {
          ...el,
          accentBarColor: cat.primary,
          headerBgColor: cat.primary,
          rowBorderColor: cat.primary,
          // fica mais coerente com fundo preto
          rowBgColor: "#020617",
          rowAltBgColor: "#030712",
          rowTextColor: (el as any).rowTextColor ?? "#ffffff",
          // começar sem bordas (você pode ligar depois via propriedades, se quiser)
          rowBorderWidth: 0,
          rowGap: 0,
          cornerRadius: 0,
        } as any;
      }),
    };
    setDoc(after);
    commitHistory(before, after);
  };

  const clampZoom = (z: number) => Math.max(0.25, Math.min(2, Number(z.toFixed(2))));

  const commitHistory = (before: EditorDocument, _after: EditorDocument) => {
    setPast((p) => {
      const next = [...p, before];
      return next.length > 80 ? next.slice(next.length - 80) : next;
    });
    setFuture([]);
  };

  const undo = () => {
    if (!doc) return;
    setPast((p) => {
      if (p.length === 0) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [doc, ...f].slice(0, 80));
      setDoc(prev);
      setSelectedIds([]);
      return p.slice(0, -1);
    });
  };

  const redo = () => {
    if (!doc) return;
    setFuture((f) => {
      if (f.length === 0) return f;
      const nextDoc = f[0];
      setPast((p) => [...p, doc].slice(-80));
      setDoc(nextDoc);
      setSelectedIds([]);
      return f.slice(1);
    });
  };

  const fitZoom = () => {
    if (!doc) return;
    const el = stageRef.current;
    const rect = el?.getBoundingClientRect();
    const viewportW = (rect?.width ?? window.innerWidth) - 64;
    const viewportH = (rect?.height ?? window.innerHeight) - 64;
    if (viewportW <= 0 || viewportH <= 0) return;
    const z = Math.min(viewportW / doc.width, viewportH / doc.height) * 0.92;
    setZoom(clampZoom(z));
  };

  // Atalhos globais
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTypingTarget = tag === "input" || tag === "textarea" || (target as any)?.isContentEditable;

      if (e.key === "h" || e.key === "H") {
        e.preventDefault();
        setShowGuides((prev) => !prev);
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        setFullscreen((prev) => !prev);
      }
      if (e.key === "Tab") {
        e.preventDefault();
        setShowDocks((prev) => !prev);
      }

      if (!isTypingTarget && (e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, past.length, future.length]);

  useEffect(() => {
    setSeo({
      title: "Gerador de Artes de Ranking | Tornefy",
      description: "Gere artes de ranking (Feed, Stories e Overlay) e baixe em PNG.",
      canonical: `${getCanonicalOrigin()}/organizer/ranking-art/${trainingId || ""}`,
    });
  }, [trainingId]);

  useEffect(() => {
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    })();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    if (roleLoading) return;
    if (role && role !== "organizer" && role !== "admin") {
      toast.error("Acesso negado. Apenas organizadores podem acessar.");
      navigate("/");
      return;
    }
  }, [user, role, roleLoading, navigate]);

  useEffect(() => {
    if (!user || roleLoading) return;
    if (!trainingId) return;
    if (role !== "organizer" && role !== "admin") return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, roleLoading, role, trainingId]);

  useEffect(() => {
    if (!user || roleLoading) return;
    if (role !== "organizer" && role !== "admin") return;
    void loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, roleLoading, role]);

  const load = async () => {
    try {
      setLoading(true);

      const { data: t, error: tErr } = await supabase
        .from("trainings")
        .select("id, name, datetime, primary_color, secondary_color, organizer_id")
        .eq("id", trainingId)
        .maybeSingle();

      if (tErr) throw tErr;
      if (!t) throw new Error("Treino não encontrado");
      if (String(t.organizer_id) !== String(user.id) && role !== "admin") {
        throw new Error("Você só pode gerar arte dos seus próprios treinos.");
      }

      const { data: matches, error: mErr } = await supabase
        .from("training_matches")
        .select("id")
        .eq("training_id", trainingId);
      if (mErr) throw mErr;

      const matchIds = (matches || []).map((m: any) => m.id).filter(Boolean);
      if (matchIds.length === 0) {
        setTraining(t);
        setRows([]);
        return;
      }

      // NOTE: `training_match_scores` não possui FK para `teams` no schema cache,
      // então não podemos usar join `teams(...)` via PostgREST.
      // Buscamos os scores e, em seguida, os times em uma segunda query.
      const { data: scores, error: sErr } = await supabase
        .from("training_match_scores")
        .select("team_id, match_id, position, kills, total_points")
        .in("match_id", matchIds);
      if (sErr) throw sErr;

      const teamIds = Array.from(
        new Set(
          (scores || [])
            .map((r: any) => String(r?.team_id || ""))
            .filter((x: string) => Boolean(x)),
        ),
      );

      const teamsById = new Map<string, { id: string; name: string | null; tag: string | null; logo_url: string | null }>();
      if (teamIds.length) {
        const { data: teams, error: teamsErr } = await supabase
          .from("teams")
          .select("id, name, tag, logo_url")
          .in("id", teamIds);
        if (teamsErr) throw teamsErr;
        for (const tm of teams || []) {
          teamsById.set(String((tm as any).id), tm as any);
        }
      }

      const agg = new Map<string, TeamRankRow>();
      for (const row of scores || []) {
        const teamId = String((row as any).team_id || "");
        if (!teamId) continue;

        const team = teamsById.get(teamId);
        const current = agg.get(teamId) || {
          team_id: teamId,
          name: String(team?.name || "Equipe"),
          tag: String(team?.tag || "—"),
          logo_url: (team?.logo_url as string | null) ?? null,
          points: 0,
          kills: 0,
          matches: 0,
          wins: 0,
        };

        const points = Number((row as any).total_points ?? 0);
        const kills = Number((row as any).kills ?? 0);
        const position = Number((row as any).position ?? 0);

        current.points += Number.isFinite(points) ? points : 0;
        current.kills += Number.isFinite(kills) ? kills : 0;
        current.matches += 1;
        if (position === 1) current.wins += 1;

        agg.set(teamId, current);
      }

      const list = Array.from(agg.values())
        .sort((a, b) => (b.points - a.points) || (b.kills - a.kills))
        .slice(0, 12);

      setTraining(t);
      setRows(list);

      const draft = readDraft();
      const hydratedDraft = draft
        ? ({
          ...draft,
          format,
          width: createDefaultDocument({ format, rows: list, primaryColor: t.primary_color, secondaryColor: t.secondary_color }).width,
          height: createDefaultDocument({ format, rows: list, primaryColor: t.primary_color, secondaryColor: t.secondary_color }).height,
          rankingRows: list,
        } as EditorDocument)
        : null;

      const nextDocRaw = hydratedDraft
        ? hydratedDraft
        : doc
          ? { ...doc, rankingRows: list, background: { ...doc.background, primaryColor: t.primary_color, secondaryColor: t.secondary_color } }
          : createDefaultDocument({
            format,
            trainingName: t.name,
            primaryColor: t.primary_color,
            secondaryColor: t.secondary_color,
            rows: list,
          });
      setDoc(normalizeDoc(nextDocRaw));
      setPast([]);
      setFuture([]);
    } catch (e: any) {
      toast.error(e?.message ? String(e.message) : "Erro ao carregar ranking");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!training) return;
    if (!rows) return;

    const draft = readDraft();
    if (draft) {
      setDoc(
        normalizeDoc({
          ...draft,
          format,
          width: createDefaultDocument({ format, rows, primaryColor: training?.primary_color, secondaryColor: training?.secondary_color }).width,
          height: createDefaultDocument({ format, rows, primaryColor: training?.primary_color, secondaryColor: training?.secondary_color }).height,
          rankingRows: rows,
        }),
      );
    } else {
      setDoc(
        normalizeDoc(
          createDefaultDocument({
            format,
            trainingName: training?.name,
            primaryColor: training?.primary_color,
            secondaryColor: training?.secondary_color,
            rows,
          }),
        ),
      );
    }
    setPast([]);
    setFuture([]);
    setSelectedIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format]);

  // Ao selecionar um elemento, abre automaticamente a aba de Propriedades.
  useEffect(() => {
    if (selectedIds.length > 0) setDockTab("props");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds.length]);

  const loadTemplates = async () => {
    if (!user) return;
    try {
      setLoadingTemplates(true);
      const { data, error } = await supabase
        .from("ranking_art_templates" as any)
        .select("id, name, format, document, updated_at")
        .eq("owner_id", String(user.id))
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setTemplates((data as any[]) || []);
    } catch (e: any) {
      toast.error(e?.message ? String(e.message) : "Erro ao carregar templates");
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Você pediu: artes iniciam sempre em 50% (não auto-ajusta).

  const applyTemplate = (t: any) => {
    if (!t?.document) return;
    const next = t.document as EditorDocument;
    // Re-hidrata rankingRows e cores do treino atual
    setDoc({
      ...next,
      format,
      width: createDefaultDocument({ format, rows, primaryColor: training?.primary_color, secondaryColor: training?.secondary_color }).width,
      height: createDefaultDocument({ format, rows, primaryColor: training?.primary_color, secondaryColor: training?.secondary_color }).height,
      rankingRows: rows,
      background: {
        kind: "training-gradient",
        primaryColor: training?.primary_color,
        secondaryColor: training?.secondary_color,
      },
    });
    setPast([]);
    setFuture([]);
    setSelectedIds([]);
  };

  const saveTemplate = async () => {
    if (!user) return;
    if (!doc) return;
    if (!templateName.trim()) {
      toast.error("Dê um nome ao template");
      return;
    }
    try {
      setSavingTemplate(true);
      const payload = {
        owner_id: String(user.id),
        training_id: null,
        name: templateName.trim(),
        format,
        document: doc,
      };

      if (selectedTemplateId) {
        const { error } = await supabase
          .from("ranking_art_templates" as any)
          .update({ name: payload.name, format: payload.format, document: payload.document })
          .eq("id", selectedTemplateId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ranking_art_templates" as any).insert(payload);
        if (error) throw error;
      }
      toast.success("Template salvo!");
      setSelectedTemplateId("");
      await loadTemplates();
    } catch (e: any) {
      toast.error(e?.message ? String(e.message) : "Erro ao salvar template");
    } finally {
      setSavingTemplate(false);
    }
  };

  const deleteTemplate = async () => {
    if (!selectedTemplateId) return;
    try {
      const { error } = await supabase.from("ranking_art_templates" as any).delete().eq("id", selectedTemplateId);
      if (error) throw error;
      toast.success("Template removido");
      setSelectedTemplateId("");
      setTemplateName("");
      await loadTemplates();
    } catch (e: any) {
      toast.error(e?.message ? String(e.message) : "Erro ao remover template");
    }
  };

  const subtitle = useMemo(() => {
    const dt = training?.datetime ? new Date(training.datetime) : null;
    if (!dt) return undefined;
    return dt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  }, [training?.datetime]);

  const download = async () => {
    if (!canvasRef.current) return;
    if (!training) return;

    try {
      setDownloading(true);
      setExportMode(true);

      // garante um frame com estilos "export-safe" aplicados antes do html-to-image
      await new Promise<void>((r) => requestAnimationFrame(() => r()));

      const dataUrl = await toPng(canvasRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "transparent",
      });

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `ranking-${training.id}-${format}.png`;
      a.click();
    } catch (e: any) {
      toast.error(e?.message ? String(e.message) : "Falha ao gerar imagem");
    } finally {
      setDownloading(false);
      setExportMode(false);
    }
  };

  const clearGuides = () => {
    if (!doc) return;
    const before = doc;
    const after = { ...doc, guides: [] };
    setDoc(after);
    commitHistory(before, after);
  };

  // Ctrl/⌘ + scroll: zoom do editor, sem zoom do navegador (apenas quando mouse estiver no stage)
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const handler = (ev: WheelEvent) => {
      if (!ev.ctrlKey && !ev.metaKey) return;
      ev.preventDefault();
      const factor = ev.deltaY > 0 ? -0.08 : 0.08;
      setZoom((current) => {
        const base = Number.isFinite(current) ? current : 1;
        return clampZoom(base + factor);
      });
    };

    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler as any);
  }, [fullscreen]);

  const centerPosition = (w: number, h: number) => {
    if (!doc) return { x: 0, y: 0 };
    const x = Math.max(0, (doc.width - w) / 2);
    const y = Math.max(0, (doc.height - h) / 2);
    return { x, y };
  };

  const addImageFromPath = async (storagePath: string) => {
    if (!doc) return;
    try {
      const { data, error } = await supabase.storage.from("ranking-art-assets").createSignedUrl(storagePath, 60 * 10);
      if (error) throw error;

      const { w: naturalW, h: naturalH } = await new Promise<{ w: number; h: number }>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
        img.onerror = () => reject(new Error("Falha ao ler dimensões da imagem"));
        img.src = data.signedUrl;
      });

      const maxW = doc.width * 0.75;
      const maxH = doc.height * 0.75;
      const scale = Math.min(1, maxW / Math.max(1, naturalW), maxH / Math.max(1, naturalH));
      const w = Math.max(20, Math.round(naturalW * scale));
      const h = Math.max(20, Math.round(naturalH * scale));

      const id = globalThis.crypto?.randomUUID?.() ?? String(Date.now()) + Math.random().toString(16).slice(2);
      const { x, y } = centerPosition(w, h);
      const el: EditorElement = {
        id,
        type: "image",
        x,
        y,
        w,
        h,
        rotation: 0,
        opacity: 1,
        storagePath,
        fit: "contain",
        borderRadius: 12,
      };
      const before = doc;
      const after = { ...doc, elements: [...doc.elements, el] };
      setDoc(after);
      commitHistory(before, after);
      setSelectedIds([id]);
    } catch (e: any) {
      toast.error(e?.message ? String(e.message) : "Falha ao inserir imagem");
    }
  };

  const addText = () => {
    if (!doc) return;
    const id = globalThis.crypto?.randomUUID?.() ?? String(Date.now()) + Math.random().toString(16).slice(2);
    const w = Math.min(800, doc.width - 240);
    const h = 120;
    const { x, y } = centerPosition(w, h);
    const el: EditorElement = {
      id,
      type: "text",
      x,
      y,
      w,
      h,
      rotation: 0,
      opacity: 1,
      text: "Seu texto",
      fontSize: 56,
      fontWeight: 800,
      align: "left",
      uppercase: false,
      letterSpacing: 0,
    };
    const before = doc;
    const after = { ...doc, elements: [...doc.elements, el] };
    setDoc(after);
    commitHistory(before, after);
    setSelectedIds([id]);
  };

  const addShape = (shapeType: any = "round") => {
    if (!doc) return;
    const id = globalThis.crypto?.randomUUID?.() ?? String(Date.now()) + Math.random().toString(16).slice(2);
    const w = shapeType === "line" ? 520 : 420;
    const h = shapeType === "line" ? 40 : 140;
    const { x, y } = centerPosition(w, h);
    const el: EditorElement = {
      id,
      type: "shape",
      x,
      y,
      w,
      h,
      rotation: 0,
      opacity: 1,
      shapeType,
      strokeWidth: shapeType === "line" ? 10 : 3,
      radius: 18,
      fillColor: null,
      strokeColor: null,
    };
    const before = doc;
    const after = { ...doc, elements: [...doc.elements, el] };
    setDoc(after);
    commitHistory(before, after);
    setSelectedIds([id]);
  };

  const addRankingTable = () => {
    if (!doc) return;
    const id = globalThis.crypto?.randomUUID?.() ?? String(Date.now()) + Math.random().toString(16).slice(2);
    const w = Math.min(820, doc.width - 240);
    const h = Math.min(900, doc.height - 600);
    const { x, y } = centerPosition(w, h);
    const el: EditorElement = {
      id,
      type: "ranking_table",
      x,
      y,
      w,
      h,
      rotation: 0,
      opacity: 1,
      limit: 12,
      showHeader: true,
      columns: ["pos", "name", "matches", "kills", "points"],
      rowFontSize: 26,
      headerFontSize: 20,
      density: "comfortable",
      rowGap: 0,
      accentBarWidth: 0,
      accentBarColor: training?.primary_color ?? null,
      headerBgColor: null,
      headerTextColor: null,
      rowBgColor: null,
      rowAltBgColor: null,
      rowBorderColor: null,
      // você pediu: começar sem bordas
      rowBorderWidth: 0,
      cornerRadius: 0,
      cellPaddingX: 8,
      cellPaddingY: 6,
    };
    const before = doc;
    const after = { ...doc, elements: [...doc.elements, el] };
    setDoc(after);
    commitHistory(before, after);
    setSelectedIds([id]);
  };

  const addImage = async (file: File) => {
    if (!user || !doc) return;
    try {
      const readNaturalSize = async () => {
        const url = URL.createObjectURL(file);
        try {
          const img = new Image();
          const { w, h } = await new Promise<{ w: number; h: number }>((resolve, reject) => {
            img.onload = () => resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
            img.onerror = () => reject(new Error("Falha ao ler dimensões da imagem"));
            img.src = url;
          });
          return { w, h };
        } finally {
          URL.revokeObjectURL(url);
        }
      };

      const clampToCanvas = (w: number, h: number) => {
        const maxW = doc.width * 0.75;
        const maxH = doc.height * 0.75;
        const scale = Math.min(1, maxW / Math.max(1, w), maxH / Math.max(1, h));
        return { w: Math.max(20, Math.round(w * scale)), h: Math.max(20, Math.round(h * scale)) };
      };

      const ext = file.name.split(".").pop() || "png";
      const objectPath = `${user.id}/${globalThis.crypto?.randomUUID?.() ?? Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("ranking-art-assets").upload(objectPath, file, {
        upsert: false,
        contentType: file.type || "image/png",
      });
      if (error) throw error;

      const natural = await readNaturalSize();
      const sized = clampToCanvas(natural.w, natural.h);

      const id = globalThis.crypto?.randomUUID?.() ?? String(Date.now()) + Math.random().toString(16).slice(2);
      const { x, y } = centerPosition(sized.w, sized.h);
      const el: EditorElement = {
        id,
        type: "image",
        x,
        y,
        w: sized.w,
        h: sized.h,
        rotation: 0,
        opacity: 1,
        storagePath: objectPath,
        fit: "contain",
        borderRadius: 12,
      };
      const before = doc;
      const after = { ...doc, elements: [...doc.elements, el] };
      setDoc(after);
      commitHistory(before, after);
      setSelectedIds([id]);
      toast.success("Imagem adicionada");
    } catch (e: any) {
      toast.error(e?.message ? String(e.message) : "Falha ao enviar imagem");
    }
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[400px] w-[400px] rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 shadow-inner">
              <Monitor className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Editor de Artes</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
              Para manter precisão total na criação, o editor funciona apenas no desktop.
              No celular, use o <strong>Modo Operador</strong> para acompanhar o treino ao vivo.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-4 space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => navigate("/organizer")}
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Painel
            </Button>
            <Button
              className="w-full justify-start gap-3 h-12 bg-gradient-to-r from-primary to-primary/80"
              onClick={() => navigate(trainingId ? `/operador/${trainingId}` : "/organizer")}
            >
              <Trophy className="h-4 w-4" />
              Abrir Modo Operador
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[#0a0a0f] overflow-hidden flex flex-col">
      {!fullscreen ? (
        <CanvaTopBar
          title="Editor de Artes"
          subtitle={training?.name || ""}
          format={format}
          onFormatChange={(v) => setFormat(v as RankingArtFormat)}
          onBack={() => navigate("/organizer")}
          onSave={saveDraft}
          onExport={download}
          exportDisabled={downloading || loading || rows.length === 0}
          docksVisible={showDocks}
          onToggleDocks={() => setShowDocks((v) => !v)}
          zoom={zoom}
          onZoomOut={() => setZoom((z) => clampZoom(z - 0.1))}
          onZoomIn={() => setZoom((z) => clampZoom(z + 0.1))}
          onZoomFit={fitZoom}
          onZoomReset={() => setZoom(0.5)}
          canUndo={past.length > 0}
          canRedo={future.length > 0}
          onUndo={undo}
          onRedo={redo}
        />
      ) : null}

      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="relative mx-auto h-16 w-16">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <GalleryHorizontalEnd className="h-6 w-6 text-primary/60" />
                </div>
              </div>
              <div>
                <p className="font-semibold text-sm">Carregando ranking…</p>
                <p className="text-xs text-muted-foreground mt-1">Buscando pontuações do treino</p>
              </div>
            </div>
          </div>
        ) : rows.length === 0 ? (
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center max-w-sm space-y-4">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-card/60">
                <ImageOff className="h-9 w-9 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Sem pontuações ainda</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Este treino ainda não possui rodadas pontuadas. Registre pelo menos uma rodada no <strong>Painel do Organizador</strong> para gerar a arte.
                </p>
              </div>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => navigate("/organizer")} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Ir para o Painel
                </Button>
                {trainingId && (
                  <Button onClick={() => navigate(`/scrim/${trainingId}?tab=matches`)} className="gap-2">
                    <Trophy className="h-4 w-4" />
                    Registrar Partidas
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          fullscreen ? (
            <div className="h-full w-full relative bg-background/40">
              <div className="absolute inset-x-4 top-3 z-20 flex items-center justify-between text-xs text-muted-foreground">
                <span>Dica: use Ctrl/⌘ + scroll para dar zoom</span>
                <Button size="sm" variant="outline" onClick={() => setFullscreen(false)}>
                  Sair do modo foco (F)
                </Button>
              </div>

              <div ref={stageRef} className="h-full w-full flex items-center justify-center pt-10">
                <div ref={canvasRef} className="max-h-full max-w-full overflow-auto">
                  {doc ? (
                    <EditorCanvas
                      doc={doc}
                      selectedIds={selectedIds}
                      onSelectIds={setSelectedIds}
                      onChange={setDoc}
                      onInteractionEnd={({ before, after }) => commitHistory(before, after)}
                      zoom={zoom}
                      exportMode={exportMode}
                      showGuides={showGuides}
                      showRulers={showGuides}
                      className="h-full"
                    />
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <ResizablePanelGroup direction="horizontal" className="h-full w-full">
              {showDocks ? (
                <>
                  <ResizablePanel defaultSize={24} minSize={14} maxSize={42}>
                    <LeftDock
                      title="Editor de Artes"
                      subtitle={training?.name || ""}
                      onBack={() => navigate("/organizer")}
                      onExport={download}
                      exportDisabled={downloading || loading || rows.length === 0}
                      hideHeader
                      value={dockTab}
                      onValueChange={setDockTab}
                    >
                      <LeftDock.Tab value="elements" label="Elementos">
                        <CanvaLeftSidebar
                          onAddText={addText}
                          onAddShape={(t) => addShape(t)}
                          onAddTable={addRankingTable}
                          onAddImageFile={(f) => void addImage(f)}
                        />
                      </LeftDock.Tab>

                      <LeftDock.Tab value="uploads" label="Uploads">
                        {user ? (
                          <UploadsGalleryPanel
                            userId={String(user.id)}
                            onUploadFile={(f) => void addImage(f)}
                            onUseImage={(path) => void addImageFromPath(path)}
                          />
                        ) : null}
                      </LeftDock.Tab>

                      <LeftDock.Tab value="layers" label="Camadas">
                        {doc ? <LayersPanel doc={doc} selectedIds={selectedIds} onSelectIds={setSelectedIds} onChange={setDoc} /> : null}
                      </LeftDock.Tab>

                      <LeftDock.Tab value="props" label="Propriedades">
                        {doc && selectedIds.length > 0 ? (
                          <div className="p-3">
                            <PropertiesPanel doc={doc} selectedIds={selectedIds} onChange={setDoc} onClearGuides={clearGuides} />
                          </div>
                        ) : (
                          <div className="p-3 text-sm text-muted-foreground">Selecione um elemento para editar suas propriedades.</div>
                        )}
                      </LeftDock.Tab>

                      <LeftDock.Tab value="theme" label="Tema">
                        <div className="p-3 space-y-3">
                          <div className="text-sm font-semibold">Tema (categoria)</div>
                          <div className="text-xs text-muted-foreground">Aplica uma paleta no editor (mantém fundo preto).</div>
                          <Select value={themeCategoryId} onValueChange={setThemeCategoryId}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {THEME_CATEGORIES.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button type="button" onClick={() => applyThemeCategory(themeCategoryId)} disabled={!doc}>
                            Aplicar tema
                          </Button>
                        </div>
                      </LeftDock.Tab>

                      <LeftDock.Tab value="templates" label="Templates">
                        <div className="p-3 space-y-3">
                          <div className="text-sm font-semibold">Templates</div>
                          <Select
                            value={selectedTemplateId}
                            onValueChange={(v) => {
                              setSelectedTemplateId(v);
                              const t = templates.find((x) => String(x.id) === String(v));
                              setTemplateName(String(t?.name ?? ""));
                              if (t) applyTemplate(t);
                            }}
                            disabled={loadingTemplates}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={loadingTemplates ? "Carregando…" : "Carregar template"} />
                            </SelectTrigger>
                            <SelectContent>
                              {templates
                                .filter((t) => String(t.format) === String(format))
                                .map((t) => (
                                  <SelectItem key={t.id} value={String(t.id)}>
                                    {t.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>

                          <div className="space-y-1">
                            <Label htmlFor="template-name">Nome do template</Label>
                            <Input
                              id="template-name"
                              value={templateName}
                              onChange={(e) => setTemplateName(e.target.value)}
                              placeholder="Ex: Overlay padrão"
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button type="button" onClick={saveTemplate} disabled={savingTemplate || !doc} className="flex-1 gap-2">
                              {savingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                              Salvar
                            </Button>
                            <Button type="button" variant="outline" onClick={deleteTemplate} disabled={!selectedTemplateId} className="gap-2">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </LeftDock.Tab>

                      <LeftDock.Tab value="tips" label="Dicas">
                        <div className="p-3 space-y-2">
                          <div className="text-sm font-semibold">Atalhos</div>
                          <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                            <li>Ctrl/⌘ + Scroll: Zoom</li>
                            <li>Ctrl/⌘ + Z: Desfazer</li>
                            <li>Ctrl/⌘ + Shift + Z: Refazer</li>
                            <li>Del: Excluir elemento</li>
                            <li>Ctrl/⌘ + D: Duplicar</li>
                            <li>Shift (resize): trava proporção</li>
                            <li>H: mostrar/ocultar guias</li>
                            <li>F: modo foco</li>
                            <li>Tab: mostrar/ocultar docks</li>
                          </ul>
                        </div>
                      </LeftDock.Tab>

                      <LeftDock.Tab value="settings" label="Configuração">
                        <div className="p-3 space-y-3">
                          <div className="text-sm font-semibold">Configuração</div>

                          <div className="space-y-2">
                            <div className="text-xs font-semibold text-muted-foreground">Modelo</div>
                            <Select value={format} onValueChange={(v) => setFormat(v as RankingArtFormat)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="feed">Post (1:1)</SelectItem>
                                <SelectItem value="stories">Story (9:16)</SelectItem>
                                <SelectItem value="overlay">Overlay (16:9)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="text-xs text-muted-foreground">Guias/Réguas</div>
                            <Button type="button" variant="outline" size="sm" onClick={() => setShowGuides((v) => !v)}>
                              {showGuides ? "Ocultar" : "Mostrar"}
                            </Button>
                          </div>
                          {user && doc ? (
                            <CanvasSettingsPanel userId={String(user.id)} doc={doc} onChange={setDoc} zoom={zoom} onZoomChange={setZoom} showZoom={false} />
                          ) : null}
                        </div>
                      </LeftDock.Tab>
                    </LeftDock>
                  </ResizablePanel>
                  <ResizableHandle withHandle />
                </>
              ) : null}

              <ResizablePanel defaultSize={showDocks ? 76 : 100} minSize={45}>
                <div className="h-full flex flex-col">
                  {/* workspace */}
                  <div ref={stageRef} className="flex-1 overflow-auto bg-[#0d0d14]" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(99,60,255,0.07) 0%, transparent 60%)' }}>
                    {dockTab === "tips" ? (
                      <div className="min-h-full flex items-center justify-center p-10">
                        <Card className="max-w-2xl w-full p-6">
                          <div className="text-lg font-semibold">Dicas & Atalhos</div>
                          <p className="text-sm text-muted-foreground mt-1">Volte para “Elementos” para ver a área de criação novamente.</p>
                          <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
                            <div className="p-3 rounded-md border">Ctrl/⌘ + Scroll: Zoom</div>
                            <div className="p-3 rounded-md border">Ctrl/⌘ + Z / Shift+Z: Undo/Redo</div>
                            <div className="p-3 rounded-md border">Del: Excluir</div>
                            <div className="p-3 rounded-md border">Ctrl/⌘ + D: Duplicar</div>
                            <div className="p-3 rounded-md border">Shift resize: trava proporção</div>
                            <div className="p-3 rounded-md border">H: guias • F: foco • Tab: docks</div>
                          </div>
                        </Card>
                      </div>
                    ) : (
                      <div className="min-h-full min-w-full flex items-center justify-center p-8">
                        <div ref={canvasRef} className="max-h-full max-w-full overflow-auto">
                          {doc ? (
                            <EditorCanvas
                              doc={doc}
                              selectedIds={selectedIds}
                              onSelectIds={setSelectedIds}
                              onChange={setDoc}
                              onInteractionEnd={({ before, after }) => commitHistory(before, after)}
                              zoom={zoom}
                              exportMode={exportMode}
                              showGuides={showGuides}
                              showRulers={showGuides}
                              className="h-full"
                            />
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          )
        )}
      </div>
    </div>
  );
}
