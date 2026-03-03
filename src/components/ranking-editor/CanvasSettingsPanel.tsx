import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { EditorDocument } from "./types";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";

type Props = {
  userId: string;
  doc: EditorDocument;
  onChange: (next: EditorDocument) => void;
  zoom?: number;
  onZoomChange?: (next: number) => void;
  showZoom?: boolean;
};

const ZOOMS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2] as const;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function CanvasSettingsPanel({ userId, doc, onChange, zoom = 1, onZoomChange, showZoom = true }: Props) {
  const [uploadingBg, setUploadingBg] = useState(false);

  const zoomValue = useMemo(() => {
    const closest = ZOOMS.reduce((acc, z) => (Math.abs(z - zoom) < Math.abs(acc - zoom) ? z : acc), 1);
    return String(closest);
  }, [zoom]);

  useEffect(() => {
    // garante defaults para campos novos
    if (!doc.background.imageFit) {
      onChange({
        ...doc,
        background: {
          ...doc.background,
          imageFit: "cover",
        },
      });
    }

    if (doc.background.gradientAngle == null || doc.background.gradientMid == null) {
      onChange({
        ...doc,
        background: {
          ...doc.background,
          gradientAngle: doc.background.gradientAngle ?? 135,
          gradientMid: doc.background.gradientMid ?? 50,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchBg = (p: Partial<EditorDocument["background"]>) => {
    onChange({ ...doc, background: { ...doc.background, ...p } });
  };

  const onUploadBackground = async (file: File) => {
    try {
      setUploadingBg(true);
      const ext = file.name.split(".").pop() || "png";
      const objectPath = `${userId}/${globalThis.crypto?.randomUUID?.() ?? Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("ranking-art-assets").upload(objectPath, file, {
        upsert: false,
        contentType: file.type || "image/png",
      });
      if (error) throw error;
      patchBg({ kind: "image", imagePath: objectPath, imageFit: doc.background.imageFit ?? "cover" });
      toast.success("Fundo atualizado");
    } catch (e: any) {
      toast.error(e?.message ? String(e.message) : "Falha ao enviar imagem de fundo");
    } finally {
      setUploadingBg(false);
    }
  };

  return (
    <Card className="p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Canvas</div>
          <div className="text-xs text-muted-foreground">Fundo{showZoom ? " e zoom" : ""}</div>
        </div>

        {showZoom && onZoomChange ? (
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => onZoomChange(clamp(zoom - 0.25, 0.25, 2))}>
              −
            </Button>
            <Select value={zoomValue} onValueChange={(v) => onZoomChange(Number(v))}>
              <SelectTrigger className="w-[92px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ZOOMS.map((z) => (
                  <SelectItem key={z} value={String(z)}>
                    {Math.round(z * 100)}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" size="sm" variant="outline" onClick={() => onZoomChange(clamp(zoom + 0.25, 0.25, 2))}>
              +
            </Button>
          </div>
        ) : null}
      </div>

      <div className="space-y-2">
        <div>
          <Label>Tipo de fundo</Label>
          <Select
            value={doc.background.kind}
            onValueChange={(v) => {
              const kind = v as EditorDocument["background"]["kind"];
              patchBg({ kind });
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="training-gradient">Gradiente do treino</SelectItem>
              <SelectItem value="gradient">Gradiente (2 cores)</SelectItem>
              <SelectItem value="solid">Cor sólida</SelectItem>
              <SelectItem value="image">Imagem</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {doc.background.kind === "solid" ? (
          <div>
            <Label>Cor</Label>
            <Input
              type="color"
              value={doc.background.solidColor || "#111111"}
              onChange={(e) => patchBg({ solidColor: e.target.value })}
            />
          </div>
        ) : null}

        {doc.background.kind === "gradient" ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Cor A</Label>
                <Input
                  type="color"
                  value={doc.background.primaryColor || "#7c3aed"}
                  onChange={(e) => patchBg({ primaryColor: e.target.value })}
                />
              </div>
              <div>
                <Label>Cor B</Label>
                <Input
                  type="color"
                  value={doc.background.secondaryColor || "#c084fc"}
                  onChange={(e) => patchBg({ secondaryColor: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Ângulo</Label>
                <div className="text-xs text-muted-foreground">{Math.round(Number(doc.background.gradientAngle ?? 135))}°</div>
              </div>
              <Slider
                value={[clamp(Number(doc.background.gradientAngle ?? 135), 0, 360)]}
                min={0}
                max={360}
                step={1}
                onValueChange={(v) => patchBg({ gradientAngle: v[0] })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Meio do degradê</Label>
                <div className="text-xs text-muted-foreground">{Math.round(Number(doc.background.gradientMid ?? 50))}%</div>
              </div>
              <Slider
                value={[clamp(Number(doc.background.gradientMid ?? 50), 0, 100)]}
                min={0}
                max={100}
                step={1}
                onValueChange={(v) => patchBg({ gradientMid: v[0] })}
              />
            </div>
          </div>
        ) : null}

        {doc.background.kind === "image" ? (
          <div className="space-y-2">
            <div>
              <Label>Ajuste</Label>
              <Select value={doc.background.imageFit || "cover"} onValueChange={(v) => patchBg({ imageFit: v as any })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cover">Cobrir</SelectItem>
                  <SelectItem value="contain">Conter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <label className="inline-flex">
              <input
                className="sr-only"
                type="file"
                accept="image/*"
                disabled={uploadingBg}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onUploadBackground(f);
                  e.currentTarget.value = "";
                }}
              />
              <Button type="button" variant="outline" className="w-full" disabled={uploadingBg} asChild>
                <span>{uploadingBg ? "Enviando…" : doc.background.imagePath ? "Trocar imagem" : "Enviar imagem"}</span>
              </Button>
            </label>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
