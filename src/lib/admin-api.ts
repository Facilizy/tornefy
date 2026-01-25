import { supabase } from "@/integrations/supabase/client";

type AdminApiSuccess<T> = { ok: true; data: T };
type AdminApiFailure = { ok: false; error: string };

export type AdminApiResult<T> = AdminApiSuccess<T> | AdminApiFailure;

export async function adminApi<T>(
  path: string,
  options: { method?: string; body?: unknown; query?: Record<string, string | undefined> } = {},
): Promise<AdminApiResult<T>> {
  const method = options.method ?? "GET";

  // IMPORTANT:
  // supabase-js web (2.91.x) não repassa corretamente a opção `path` em `functions.invoke()`.
  // Isso fazia a chamada sempre bater em `/functions/v1/admin-api` (sem sub-rotas) → 404.
  // Aqui usamos fetch direto no endpoint completo.
  const searchParams = new URLSearchParams();
  Object.entries(options.query ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== "") searchParams.set(k, v);
  });

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;
  if (!accessToken) return { ok: false, error: "Sem sessão ativa" };

  const baseUrl = String((supabase as any).supabaseUrl ?? "");
  const anonKey = String((supabase as any).supabaseKey ?? "");
  if (!baseUrl || !anonKey) return { ok: false, error: "Supabase client inválido" };

  const url = `${baseUrl}/functions/v1/admin-api${normalizedPath}${searchParams.size ? `?${searchParams.toString()}` : ""}`;

  try {
    const res = await fetch(url, {
      method,
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    const text = await res.text();
    const parsed = text ? (() => {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    })() : null;

    if (!res.ok) {
      const msg =
        typeof parsed === "object" && parsed && "error" in (parsed as any)
          ? String((parsed as any).error)
          : typeof parsed === "string" && parsed
            ? parsed
            : `HTTP ${res.status}`;
      return { ok: false, error: msg };
    }

    if (parsed === null || parsed === "") return { ok: false, error: "Resposta vazia" };
    if (typeof parsed === "object" && parsed && "error" in (parsed as any)) {
      return { ok: false, error: String((parsed as any).error) };
    }
    return { ok: true, data: parsed as T };
  } catch (e: any) {
    return { ok: false, error: e?.message ? String(e.message) : "Falha de rede" };
  }
}
