import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { BringToFront, ChevronDown, ChevronUp, Copy, Lock, Trash2, Unlock } from "lucide-react";
import type { EditorDocument, EditorElement, ShapeElement, TextElement } from "./types";
import TornefyLogo from "@/components/TornefyLogo";

type Props = {
  doc: EditorDocument;
  selected: EditorElement;
  onChange: (next: EditorDocument) => void;
  onDelete: () => void;
  onDuplicate: () => void;
};

export function SelectionToolbar({ doc, selected, onChange, onDelete, onDuplicate }: Props) {
  const patch = (p: Partial<EditorElement>) => {
    onChange({ ...doc, elements: doc.elements.map((x) => (x.id === selected.id ? ({ ...x, ...p } as any) : x)) });
  };

  const move = (dir: "up" | "down" | "top") => {
    const idx = doc.elements.findIndex((e) => e.id === selected.id);
    if (idx < 0) return;
    const next = [...doc.elements];
    const [it] = next.splice(idx, 1);
    if (dir === "top") next.push(it);
    else if (dir === "up") next.splice(Math.min(next.length, idx + 1), 0, it);
    else next.splice(Math.max(0, idx - 1), 0, it);
    onChange({ ...doc, elements: next });
  };

  return (
    <Card className={cn("pointer-events-auto px-2 py-2 flex items-center gap-2 shadow-md", "bg-popover/70 backdrop-blur supports-[backdrop-filter]:bg-popover/50")}>
      <div className="flex items-center gap-2 pr-2 border-r border-border/60">
        <TornefyLogo className="h-5" />
      </div>

      {selected.type === "text" ? <TextControls el={selected} patch={patch} /> : null}
      {selected.type === "shape" ? <ShapeControls el={selected} patch={patch} /> : null}

      <div className="flex items-center gap-1 pl-2 border-l border-border/60">
        <Button size="icon" variant="ghost" onClick={() => move("down")} title="Mandar para trás">
          <ChevronDown />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => move("up")} title="Trazer para frente">
          <ChevronUp />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => move("top")} title="Trazer para o topo">
          <BringToFront />
        </Button>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => patch({ locked: !selected.locked })}
          title={selected.locked ? "Desbloquear" : "Bloquear"}
        >
          {selected.locked ? <Lock /> : <Unlock />}
        </Button>

        <Button size="icon" variant="ghost" onClick={onDuplicate} title="Duplicar (Ctrl/Cmd+D)">
          <Copy />
        </Button>
        <Button size="icon" variant="ghost" onClick={onDelete} title="Excluir (Del)">
          <Trash2 />
        </Button>
      </div>
    </Card>
  );
}

function TextControls({ el, patch }: { el: TextElement; patch: (p: Partial<EditorElement>) => void }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Label className="text-xs text-muted-foreground">Tamanho</Label>
        <Input
          className="h-9 w-[78px]"
          type="number"
          value={el.fontSize}
          onChange={(e) => patch({ fontSize: Number(e.target.value) } as any)}
        />
      </div>

      <ToggleGroup type="single" value={el.align} onValueChange={(v) => v && patch({ align: v as any } as any)} className="gap-1">
        <ToggleGroupItem value="left" aria-label="Alinhar à esquerda">L</ToggleGroupItem>
        <ToggleGroupItem value="center" aria-label="Centralizar">C</ToggleGroupItem>
        <ToggleGroupItem value="right" aria-label="Alinhar à direita">R</ToggleGroupItem>
      </ToggleGroup>

      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Cor</Label>
        <Input
          className="h-9 w-12 p-1"
          type="color"
          value={el.color || "#ffffff"}
          onChange={(e) => patch({ color: e.target.value } as any)}
        />
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Upper</Label>
        <Switch checked={Boolean(el.uppercase)} onCheckedChange={(v) => patch({ uppercase: v } as any)} />
      </div>
    </div>
  );
}

function ShapeControls({ el, patch }: { el: ShapeElement; patch: (p: Partial<EditorElement>) => void }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Label className="text-xs text-muted-foreground">Borda</Label>
        <Input
          className="h-9 w-[70px]"
          type="number"
          value={el.strokeWidth}
          onChange={(e) => patch({ strokeWidth: Math.max(0, Number(e.target.value)) } as any)}
        />
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Fill</Label>
        <Input
          className="h-9 w-12 p-1"
          type="color"
          value={el.fillColor || "#9ca3af"}
          onChange={(e) => patch({ fillColor: e.target.value } as any)}
        />
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Stroke</Label>
        <Input
          className="h-9 w-12 p-1"
          type="color"
          value={el.strokeColor || "#111827"}
          onChange={(e) => patch({ strokeColor: e.target.value } as any)}
        />
      </div>
    </div>
  );
}
