import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FolderOpen, Image as ImageIcon, Shapes, Type, Table2, Square, Circle, Minus, Triangle, Star, ArrowRight } from "lucide-react";
import type { ShapeElement } from "@/components/ranking-editor/types";

type Props = {
  className?: string;
  onAddText: () => void;
  onAddShape: (shapeType: ShapeElement["shapeType"]) => void;
  onAddTable: () => void;
  onAddImageFile: (file: File) => void;
};

type ElementCard = {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
};

export function CanvaLeftSidebar({ className, onAddText, onAddShape, onAddTable, onAddImageFile }: Props) {
  const primaryElements: ElementCard[] = [
    {
      label: "Texto",
      icon: <Type className="h-5 w-5" />,
      onClick: onAddText,
    },
    {
      label: "Tabela",
      icon: <Table2 className="h-5 w-5" />,
      onClick: onAddTable,
    },
  ];

  const shapes: { label: string; shapeType: ShapeElement["shapeType"]; icon: React.ReactNode }[] = [
    { label: "Retângulo", shapeType: "rect", icon: <Square className="h-4 w-4" /> },
    { label: "Círculo", shapeType: "circle", icon: <Circle className="h-4 w-4" /> },
    { label: "Linha", shapeType: "line", icon: <Minus className="h-4 w-4" /> },
    { label: "Triângulo", shapeType: "triangle", icon: <Triangle className="h-4 w-4" /> },
    { label: "Estrela", shapeType: "star", icon: <Star className="h-4 w-4" /> },
    { label: "Seta", shapeType: "arrow", icon: <ArrowRight className="h-4 w-4" /> },
  ];

  return (
    <div className={cn("p-3 space-y-5", className)}>
      {/* Section: Principais */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
          Elementos
        </p>
        <div className="grid grid-cols-2 gap-2">
          {primaryElements.map((el) => (
            <button
              key={el.label}
              type="button"
              onClick={el.onClick}
              className="group flex flex-col items-center justify-center gap-2 rounded-xl border py-4 transition-all duration-150 hover:scale-[1.02]"
              style={{
                background: "rgba(255,255,255,0.04)",
                borderColor: "rgba(255,255,255,0.08)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
              }}
            >
              <span style={{ color: "rgba(255,255,255,0.6)" }}>{el.icon}</span>
              <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
                {el.label}
              </span>
            </button>
          ))}

          {/* Forma genérica */}
          <button
            type="button"
            onClick={() => onAddShape("round")}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border py-4 transition-all duration-150 hover:scale-[1.02]"
            style={{
              background: "rgba(255,255,255,0.04)",
              borderColor: "rgba(255,255,255,0.08)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            }}
          >
            <span style={{ color: "rgba(255,255,255,0.6)" }}>
              <Shapes className="h-5 w-5" />
            </span>
            <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
              Forma
            </span>
          </button>

          {/* Upload de imagem */}
          <label className="flex flex-col items-center justify-center gap-2 rounded-xl border py-4 cursor-pointer transition-all duration-150 hover:scale-[1.02]"
            style={{
              background: "rgba(255,255,255,0.04)",
              borderColor: "rgba(255,255,255,0.08)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.08)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.04)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            }}
          >
            <input
              className="sr-only"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onAddImageFile(f);
                e.currentTarget.value = "";
              }}
            />
            <span style={{ color: "rgba(255,255,255,0.6)" }}>
              <ImageIcon className="h-5 w-5" />
            </span>
            <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
              Imagem
            </span>
          </label>
        </div>
      </div>

      {/* Section: Formas rápidas */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
          Formas rápidas
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          {shapes.map((s) => (
            <button
              key={s.shapeType}
              type="button"
              onClick={() => onAddShape(s.shapeType)}
              className="flex flex-col items-center justify-center gap-1.5 rounded-lg border py-3 text-center transition-all duration-150"
              style={{
                background: "rgba(255,255,255,0.03)",
                borderColor: "rgba(255,255,255,0.07)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
              }}
            >
              <span style={{ color: "rgba(255,255,255,0.5)" }}>{s.icon}</span>
              <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
