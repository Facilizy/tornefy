export type PresetKey = "padrao" | "compacto" | "grande";

export function buildUrl(base: string, path: string, params: Record<string, string>) {
  const url = new URL(path, base);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== "") url.searchParams.set(k, v);
  });
  return url.toString();
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
