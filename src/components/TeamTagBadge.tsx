import { hexToRgba } from "@/lib/color";

type Props = {
  tag: string;
  primaryColor?: string | null;
  className?: string;
};

export default function TeamTagBadge({ tag, primaryColor, className }: Props) {
  const safeTag = (tag || "").trim();
  if (!safeTag) return null;

  const color = primaryColor || undefined;

  return (
    <span
      className={
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-black uppercase tracking-wide " +
        (className || "")
      }
      style={{
        color,
        backgroundColor: color ? hexToRgba(color, 0.14) : undefined,
        borderColor: color ? hexToRgba(color, 0.3) : undefined,
      }}
      title={`Time: ${safeTag}`}
    >
      [{safeTag}]
    </span>
  );
}
