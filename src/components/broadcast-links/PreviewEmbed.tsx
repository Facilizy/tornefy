import { useEffect, useRef, useState } from "react";
import { clamp } from "./url";

type Props = {
  src: string;
  baseWidth?: number;
  baseHeight?: number;
  /** Altura máxima do preview no modal (fica menor) */
  maxPreviewHeight?: number;
  /** Remove o fundo/borda do container (útil para preview transparente) */
  transparent?: boolean;
};

export function PreviewEmbed({
  src,
  baseWidth = 1920,
  baseHeight = 300,
  maxPreviewHeight = 160,
  transparent = false,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.3);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width ?? 0;
      if (!w) return;

      const byWidth = w / baseWidth;
      const byHeight = maxPreviewHeight / baseHeight;
      setScale(clamp(Math.min(byWidth, byHeight), 0.12, 1));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [baseWidth, baseHeight, maxPreviewHeight]);

  return (
    <div
      ref={wrapRef}
      className={
        transparent
          ? "w-full overflow-hidden"
          : "w-full rounded-xl border border-border bg-muted/20 overflow-hidden"
      }
      style={{ height: baseHeight * scale }}
    >
      <iframe
        title="Preview OBS"
        src={src}
        width={baseWidth}
        height={baseHeight}
        className="origin-top-left"
        style={{ transform: `scale(${scale})`, border: 0 }}
      />
    </div>
  );
}
