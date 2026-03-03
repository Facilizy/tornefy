import type { EditorDocument, EditorElement, EditorGroup } from "@/components/ranking-editor/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Lock, Trash2, Unlock, Folder, FolderOpen } from "lucide-react";
import { useMemo } from "react";

type Props = {
  doc: EditorDocument;
  selectedIds: string[];
  onSelectIds: (ids: string[]) => void;
  onChange: (next: EditorDocument) => void;
};

function labelFor(el: EditorElement) {
  if (el.type === "text") return `Texto: ${String(el.text).slice(0, 24)}`;
  if (el.type === "shape") return `Forma: ${el.shapeType}`;
  if (el.type === "image") return "Imagem";
  if (el.type === "ranking_table") return "Tabela";
  if (el.type === "brand_mark") return "Logo Tornefy";
  return "Elemento";
}

export function LayersPanel({ doc, selectedIds, onSelectIds, onChange }: Props) {
  const layers = useMemo(() => [...doc.elements].map((el, idx) => ({ el, idx })).reverse(), [doc.elements]);
  const groups = doc.groups ?? [];

  const move = (id: string, dir: "up" | "down") => {
    const idx = doc.elements.findIndex((e) => e.id === id);
    if (idx < 0) return;
    const next = [...doc.elements];
    const [it] = next.splice(idx, 1);
    if (dir === "up") next.splice(Math.min(next.length, idx + 1), 0, it);
    else next.splice(Math.max(0, idx - 1), 0, it);
    onChange({ ...doc, elements: next });
  };

  const patch = (id: string, p: Partial<EditorElement>) => {
    onChange({ ...doc, elements: doc.elements.map((e) => (e.id === id ? ({ ...e, ...p } as any) : e)) });
  };

  const remove = (id: string) => {
    onChange({ ...doc, elements: doc.elements.filter((e) => e.id !== id) });
    onSelectIds(selectedIds.filter(s => s !== id));
  };

  const groupSelected = () => {
    if (selectedIds.length < 2) return;
    const newGroupId = crypto.randomUUID();
    const newGroup: EditorGroup = {
      id: newGroupId,
      name: `Grupo ${(groups.length + 1)}`,
      elementIds: [...selectedIds],
      locked: false,
    };
    onChange({ ...doc, groups: [...groups, newGroup] });
  };

  const ungroupSelected = () => {
    if (selectedIds.length !== 1) return;
    const grp = groups.find(g => g.id === selectedIds[0]);
    if (!grp) return;
    onChange({ ...doc, groups: groups.filter(g => g.id !== grp.id) });
    onSelectIds([]);
  };

  const toggleGroupLock = (groupId: string) => {
    onChange({ ...doc, groups: groups.map(g => g.id === groupId ? { ...g, locked: !g.locked } : g) });
  };

  const removeGroup = (groupId: string) => {
    onChange({ ...doc, groups: groups.filter(g => g.id !== groupId) });
    onSelectIds(selectedIds.filter(s => s !== groupId));
  };

  const handleSelectElement = (id: string, e: React.MouseEvent) => {
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      if (selectedIds.includes(id)) {
        onSelectIds(selectedIds.filter(s => s !== id));
      } else {
        onSelectIds([...selectedIds, id]);
      }
    } else {
      onSelectIds([id]);
    }
  };

  const handleSelectGroup = (groupId: string, e: React.MouseEvent) => {
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      if (selectedIds.includes(groupId)) {
        onSelectIds(selectedIds.filter(s => s !== groupId));
      } else {
        onSelectIds([...selectedIds, groupId]);
      }
    } else {
      onSelectIds([groupId]);
    }
  };

  return (
    <div className="p-3 space-y-3">
      <div className="text-sm font-semibold">Camadas</div>

      {selectedIds.length >= 2 ? (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={groupSelected}>
            <Folder className="h-4 w-4 mr-2" />
            Agrupar ({selectedIds.length})
          </Button>
        </div>
      ) : null}

      {selectedIds.length === 1 && groups.find(g => g.id === selectedIds[0]) ? (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={ungroupSelected}>
            <FolderOpen className="h-4 w-4 mr-2" />
            Desagrupar
          </Button>
        </div>
      ) : null}

      {layers.length === 0 && groups.length === 0 ? (
        <Card className="p-3">
          <div className="text-sm text-muted-foreground">Nenhum elemento no canvas.</div>
        </Card>
      ) : (
        <div className="space-y-2">
          {groups.map((grp) => (
            <Card
              key={grp.id}
              className={cn("p-2", selectedIds.includes(grp.id) ? "ring-1 ring-ring" : "")}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={(e) => handleSelectGroup(grp.id, e)}
                >
                  <div className="text-xs font-medium truncate flex items-center gap-1">
                    <Folder className="h-3 w-3" />
                    {grp.name || "Grupo"}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {grp.elementIds.length} elementos {grp.locked ? "• Bloqueado" : ""}
                  </div>
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => toggleGroupLock(grp.id)}
                  title={grp.locked ? "Desbloquear" : "Bloquear"}
                >
                  {grp.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => removeGroup(grp.id)} title="Remover grupo">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}

          {layers.map(({ el }) => (
            <Card
              key={el.id}
              className={cn("p-2", selectedIds.includes(el.id) ? "ring-1 ring-ring" : "")}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={(e) => handleSelectElement(el.id, e)}
                >
                  <div className="text-xs font-medium truncate">{labelFor(el)}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{el.locked ? "Bloqueado" : "Livre"}</div>
                </button>

                <Button size="icon" variant="ghost" onClick={() => move(el.id, "down")} title="Mandar para trás">
                  <ChevronDown className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => move(el.id, "up")} title="Trazer para frente">
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => patch(el.id, { locked: !el.locked })}
                  title={el.locked ? "Desbloquear" : "Bloquear"}
                >
                  {el.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(el.id)} title="Excluir">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="p-3">
        <div className="text-xs text-muted-foreground">
          Agrupar/desagrupar e multi-seleção entram na próxima etapa (precisa de seleção múltipla no canvas).
        </div>
      </Card>
    </div>
  );
}
