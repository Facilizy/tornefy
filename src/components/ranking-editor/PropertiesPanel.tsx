import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { EditorDocument, EditorElement, ImageElement, RankingTableElement, ShapeElement, TextElement } from "./types";

const TABLE_COLS = [
  { key: "pos", label: "Pos" },
  { key: "logo", label: "Logo" },
  { key: "tag", label: "Tag" },
  { key: "name", label: "Nome" },
  { key: "matches", label: "Part" },
  { key: "kills", label: "Kills" },
  { key: "points", label: "Pts" },
  { key: "wins", label: "Wins" },
] as const;

type Props = {
  doc: EditorDocument;
  selectedIds: string[];
  onChange: (next: EditorDocument) => void;
  onClearGuides?: () => void;
};

export function PropertiesPanel({ doc, selectedIds, onChange, onClearGuides }: Props) {
  if (selectedIds.length === 0) return null;
  if (selectedIds.length > 1) {
    return (
      <Card className="p-3">
        <div className="text-sm font-semibold">Multi-seleção</div>
        <div className="text-xs text-muted-foreground mt-2">{selectedIds.length} itens selecionados.</div>
      </Card>
    );
  }

  const selectedId = selectedIds[0];
  const grp = doc.groups?.find((g) => g.id === selectedId);
  if (grp) {
    return (
      <Card className="p-3">
        <div className="text-sm font-semibold">Grupo</div>
        <div className="text-xs text-muted-foreground mt-2">{grp.name || "Grupo"} ({grp.elementIds.length} elementos)</div>
      </Card>
    );
  }

  const el = doc.elements.find((e) => e.id === selectedId);
  if (!el) return null;

  const patch = (p: Partial<EditorElement>) => {
    onChange({ ...doc, elements: doc.elements.map((x) => (x.id === selectedId ? ({ ...x, ...p } as any) : x)) });
  };

  return (
    <div className="space-y-3">
      <Card className="p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold">Propriedades</div>
          {onClearGuides ? (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={onClearGuides}
            >
              Limpar guias
            </button>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>X</Label>
            <Input type="number" value={Math.round(el.x)} onChange={(e) => patch({ x: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Y</Label>
            <Input type="number" value={Math.round(el.y)} onChange={(e) => patch({ y: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Largura</Label>
            <Input type="number" value={Math.round(el.w)} onChange={(e) => patch({ w: Math.max(20, Number(e.target.value)) })} />
          </div>
          <div>
            <Label>Altura</Label>
            <Input type="number" value={Math.round(el.h)} onChange={(e) => patch({ h: Math.max(20, Number(e.target.value)) })} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Rotação</Label>
            <Input type="number" value={Math.round(el.rotation)} onChange={(e) => patch({ rotation: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Opacidade</Label>
            <Input
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={el.opacity}
              onChange={(e) => patch({ opacity: Math.max(0, Math.min(1, Number(e.target.value))) })}
            />
          </div>
        </div>
      </Card>

      {el.type === "text" ? <TextProps el={el} patch={patch} /> : null}
      {el.type === "shape" ? <ShapeProps el={el} patch={patch} /> : null}
      {el.type === "image" ? <ImageProps el={el} patch={patch} /> : null}
      {el.type === "ranking_table" ? <TableProps el={el} patch={patch} /> : null}
    </div>
  );
}

function TextProps({ el, patch }: { el: TextElement; patch: (p: Partial<EditorElement>) => void }) {
  const colorMode = el.splitColor ? "split" : "single";
  return (
    <Card className="p-3 space-y-2">
      <div className="text-sm font-semibold">Texto</div>
      <div>
        <Label>Conteúdo</Label>
        <Input value={el.text} onChange={(e) => patch({ text: e.target.value } as any)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Tamanho</Label>
          <Input type="number" value={el.fontSize} onChange={(e) => patch({ fontSize: Number(e.target.value) } as any)} />
        </div>
        <div>
          <Label>Peso</Label>
          <Input type="number" value={el.fontWeight} onChange={(e) => patch({ fontWeight: Number(e.target.value) } as any)} />
        </div>
      </div>
      <div>
        <Label>Alinhamento</Label>
        <Select value={el.align} onValueChange={(v) => patch({ align: v as any } as any)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="left">Esquerda</SelectItem>
            <SelectItem value="center">Centro</SelectItem>
            <SelectItem value="right">Direita</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Cor do texto</Label>
        <Select
          value={colorMode}
          onValueChange={(v) => {
            if (v === "single") patch({ splitColor: null } as any);
            else patch({ splitColor: el.splitColor || "#7c3aed" } as any);
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="single">Única</SelectItem>
            <SelectItem value="split">Split 50/50</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-2">
        {colorMode === "single" ? (
          <div className="flex items-center gap-2">
            <Label className="text-sm">Cor</Label>
            <Input className="h-9 w-12 p-1" type="color" value={el.color || "#ffffff"} onChange={(e) => patch({ color: e.target.value } as any)} />
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm">Esq.</Label>
              <Input className="h-9 w-12 p-1" type="color" value={el.color || "#ffffff"} onChange={(e) => patch({ color: e.target.value } as any)} />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-sm">Dir.</Label>
              <Input
                className="h-9 w-12 p-1"
                type="color"
                value={el.splitColor || "#7c3aed"}
                onChange={(e) => patch({ splitColor: e.target.value } as any)}
              />
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Label className="text-sm">Upper</Label>
          <Switch checked={Boolean(el.uppercase)} onCheckedChange={(v) => patch({ uppercase: v } as any)} />
        </div>
      </div>
    </Card>
  );
}

function ShapeProps({ el, patch }: { el: ShapeElement; patch: (p: Partial<EditorElement>) => void }) {
  return (
    <Card className="p-3 space-y-2">
      <div className="text-sm font-semibold">Forma</div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Tipo</Label>
          <Input value={el.shapeType} readOnly />
        </div>
        <div>
          <Label>Borda</Label>
          <Input type="number" value={el.strokeWidth} onChange={(e) => patch({ strokeWidth: Math.max(0, Number(e.target.value)) } as any)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Fill</Label>
          <Input className="h-9 w-full p-1" type="color" value={el.fillColor || "#9ca3af"} onChange={(e) => patch({ fillColor: e.target.value } as any)} />
        </div>
        <div>
          <Label>Stroke</Label>
          <Input className="h-9 w-full p-1" type="color" value={el.strokeColor || "#111827"} onChange={(e) => patch({ strokeColor: e.target.value } as any)} />
        </div>
      </div>
      {el.shapeType === "round" ? (
        <div>
          <Label>Raio</Label>
          <Input type="number" value={el.radius} onChange={(e) => patch({ radius: Math.max(0, Number(e.target.value)) } as any)} />
        </div>
      ) : null}
    </Card>
  );
}

function ImageProps({ el, patch }: { el: ImageElement; patch: (p: Partial<EditorElement>) => void }) {
  return (
    <Card className="p-3 space-y-2">
      <div className="text-sm font-semibold">Imagem</div>
      <div>
        <Label>Ajuste</Label>
        <Select value={el.fit} onValueChange={(v) => patch({ fit: v as any } as any)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cover">Cover</SelectItem>
            <SelectItem value="contain">Contain</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Arredondamento</Label>
        <Input type="number" value={el.borderRadius} onChange={(e) => patch({ borderRadius: Math.max(0, Number(e.target.value)) } as any)} />
      </div>
    </Card>
  );
}

function TableProps({ el, patch }: { el: RankingTableElement; patch: (p: Partial<EditorElement>) => void }) {
  const cols = el.columns || [];
  const toggleCol = (key: any) => {
    const exists = cols.includes(key);
    const next = exists ? cols.filter((c) => c !== key) : [...cols, key];
    patch({ columns: next } as any);
  };

  const reorderCols = (fromKey: any, toKey: any) => {
    if (fromKey === toKey) return;
    const fromIdx = cols.indexOf(fromKey);
    const toIdx = cols.indexOf(toKey);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = [...cols];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    patch({ columns: next } as any);
  };

  return (
    <Card className="p-3 space-y-2">
      <div className="text-sm font-semibold">Tabela</div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Top</Label>
          <Input type="number" min={1} max={50} value={el.limit} onChange={(e) => patch({ limit: Math.max(1, Number(e.target.value)) } as any)} />
        </div>
        <div>
          <Label>Densidade</Label>
          <Select value={el.density} onValueChange={(v) => patch({ density: v as any } as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="compact">Compacta</SelectItem>
              <SelectItem value="comfortable">Confortável</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label>Texto (linhas)</Label>
        <Input
          className="h-9 w-full p-1"
          type="color"
          value={(el as any).rowTextColor || "#ffffff"}
          onChange={(e) => patch({ rowTextColor: e.target.value } as any)}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Row gap (px)</Label>
          <Input
            type="number"
            min={0}
            max={24}
            value={typeof el.rowGap === "number" ? el.rowGap : 0}
            onChange={(e) => patch({ rowGap: Math.max(0, Number(e.target.value)) } as any)}
          />
        </div>
        <div>
          <Label>Radius (px)</Label>
          <Input
            type="number"
            min={0}
            max={32}
            value={typeof el.cornerRadius === "number" ? el.cornerRadius : 0}
            onChange={(e) => patch({ cornerRadius: Math.max(0, Number(e.target.value)) } as any)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Padding X</Label>
          <Input
            type="number"
            min={0}
            max={48}
            value={typeof el.cellPaddingX === "number" ? el.cellPaddingX : 0}
            onChange={(e) => patch({ cellPaddingX: Math.max(0, Number(e.target.value)) } as any)}
          />
        </div>
        <div>
          <Label>Padding Y</Label>
          <Input
            type="number"
            min={0}
            max={48}
            value={typeof el.cellPaddingY === "number" ? el.cellPaddingY : 0}
            onChange={(e) => patch({ cellPaddingY: Math.max(0, Number(e.target.value)) } as any)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Borda (px)</Label>
          <Input
            type="number"
            min={0}
            max={6}
            value={typeof el.rowBorderWidth === "number" ? el.rowBorderWidth : 0}
            onChange={(e) => patch({ rowBorderWidth: Math.max(0, Number(e.target.value)) } as any)}
          />
        </div>
        <div>
          <Label>Barra esquerda (px)</Label>
          <Input
            type="number"
            min={0}
            max={24}
            value={typeof el.accentBarWidth === "number" ? el.accentBarWidth : 0}
            onChange={(e) => patch({ accentBarWidth: Math.max(0, Number(e.target.value)) } as any)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>Cor barra</Label>
          <Input
            className="h-9 w-full p-1"
            type="color"
            value={el.accentBarColor || "#000000"}
            onChange={(e) => patch({ accentBarColor: e.target.value } as any)}
          />
        </div>
        <div className="space-y-1">
          <Label>Cor borda</Label>
          <Input
            className="h-9 w-full p-1"
            type="color"
            value={el.rowBorderColor || "#000000"}
            onChange={(e) => patch({ rowBorderColor: e.target.value } as any)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>Header BG</Label>
          <Input
            className="h-9 w-full p-1"
            type="color"
            value={el.headerBgColor || "#000000"}
            onChange={(e) => patch({ headerBgColor: e.target.value } as any)}
          />
        </div>
        <div className="space-y-1">
          <Label>Header texto</Label>
          <Input
            className="h-9 w-full p-1"
            type="color"
            value={el.headerTextColor || "#ffffff"}
            onChange={(e) => patch({ headerTextColor: e.target.value } as any)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label>Row BG</Label>
          <Input
            className="h-9 w-full p-1"
            type="color"
            value={el.rowBgColor || "#000000"}
            onChange={(e) => patch({ rowBgColor: e.target.value } as any)}
          />
        </div>
        <div className="space-y-1">
          <Label>Row alt BG</Label>
          <Input
            className="h-9 w-full p-1"
            type="color"
            value={el.rowAltBgColor || "#000000"}
            onChange={(e) => patch({ rowAltBgColor: e.target.value } as any)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Fonte (linhas)</Label>
          <Input type="number" value={el.rowFontSize} onChange={(e) => patch({ rowFontSize: Number(e.target.value) } as any)} />
        </div>
        <div>
          <Label>Fonte (header)</Label>
          <Input type="number" value={el.headerFontSize} onChange={(e) => patch({ headerFontSize: Number(e.target.value) } as any)} />
        </div>
      </div>

      <Card className="p-3 space-y-2">
        <div className="text-sm font-semibold">Colunas (ordem + visibilidade)</div>
        <div className="text-xs text-muted-foreground">Arraste para reordenar.</div>
        <div className="space-y-2">
          {cols.map((key) => {
            const meta = TABLE_COLS.find((c) => c.key === key) || { key, label: String(key) };
            return (
              <div
                key={key}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", String(key));
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = e.dataTransfer.getData("text/plain");
                  if (from) reorderCols(from, key);
                }}
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                title="Arraste para mudar a ordem"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground">⋮⋮</span>
                  <span className="text-xs truncate">{meta.label}</span>
                </div>
                <Switch checked={cols.includes(key as any)} onCheckedChange={() => toggleCol(key)} />
              </div>
            );
          })}
        </div>

        <div className="pt-2 border-t">
          <div className="text-xs text-muted-foreground mb-2">Adicionar/remover colunas</div>
          <div className="grid grid-cols-2 gap-2">
            {TABLE_COLS.map((c) => {
              const enabled = cols.includes(c.key as any);
              return (
                <div key={c.key} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                  <span className="text-xs text-muted-foreground">{c.label}</span>
                  <Switch checked={enabled} onCheckedChange={() => toggleCol(c.key)} />
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <Label>Mostrar header</Label>
        <Switch checked={Boolean(el.showHeader)} onCheckedChange={(v) => patch({ showHeader: v } as any)} />
      </div>
    </Card>
  );
}
