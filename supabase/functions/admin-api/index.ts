import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  // Required for PATCH/DELETE preflight in browsers
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
};

type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

function json(data: Json, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...(init.headers ?? {}),
    },
  });
}

function badRequest(message: string) {
  return json({ error: message }, { status: 400 });
}

function forbidden() {
  return json({ error: "forbidden" }, { status: 403 });
}

function serverError(message: string) {
  return json({ error: message }, { status: 500 });
}

function pick<T extends Record<string, unknown>>(obj: T, allowed: string[]) {
  const out: Record<string, unknown> = {};
  allowed.forEach((k) => {
    if (k in obj) out[k] = obj[k];
  });
  return out;
}

function numParam(url: URL, key: string, fallback: number) {
  const raw = url.searchParams.get(key);
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

async function logAudit(
  adminDb: any,
  args: {
    actor_id: string;
    method: string;
    path: string;
    action: string;
    entity_type?: string | null;
    entity_id?: string | null;
    request?: unknown;
    before?: unknown;
    after?: unknown;
    response_count?: number | null;
  },
) {
  try {
    await adminDb.from("admin_audit_logs").insert({
      actor_id: args.actor_id,
      method: args.method,
      path: args.path,
      action: args.action,
      entity_type: args.entity_type ?? null,
      entity_id: args.entity_id ?? null,
      request: (args.request ?? null) as any,
      before: (args.before ?? null) as any,
      after: (args.after ?? null) as any,
      response_count: args.response_count ?? null,
    } as any);
  } catch {
    // best-effort
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    // Preflight response must include allowed methods/headers
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !serviceKey || !anonKey) {
      return serverError("Supabase env vars not set");
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return forbidden();
    }

    // Validate JWT and get user
    const authed = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await authed.auth.getUser();
    if (userError || !userData?.user) return forbidden();
    const uid = String(userData.user.id);

    // Service role client (only after auth)
    const adminDb = createClient(supabaseUrl, serviceKey);
    const { data: adminRoleRow, error: adminRoleError } = await adminDb
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .eq("role", "admin")
      .maybeSingle();
    if (adminRoleError || !adminRoleRow) return forbidden();

    const url = new URL(req.url);
    const segments = url.pathname.split("/").filter(Boolean);
    const fnIndex = segments.indexOf("admin-api");
    const subPath = fnIndex >= 0 ? `/${segments.slice(fnIndex + 1).join("/")}` : "/";

    const limit = Math.min(Math.max(numParam(url, "limit", 20), 1), 100);
    const offset = Math.max(numParam(url, "offset", 0), 0);
    const includeDeleted = url.searchParams.get("include_deleted") === "1";

    // ----------------
    // Popups (educational_popups)
    // GET /popups
    // POST /popups
    // PATCH /popups/:id
    // DELETE /popups/:id
    // POST /popups/:id/send  (reset dismissals so everyone sees again)
    // ----------------
    if (req.method === "GET" && subPath === "/popups") {
      const search = url.searchParams.get("search") ?? "";

      let q = adminDb
        .from("educational_popups")
        .select("id,kind,active,title,description,cta_label,svg_markup,starts_at,ends_at,audience,created_at,updated_at")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (search.trim()) q = q.ilike("title", `%${search.trim()}%`);

      let countQ = adminDb.from("educational_popups").select("id", { count: "exact", head: true });
      if (search.trim()) countQ = countQ.ilike("title", `%${search.trim()}%`);

      const [{ data, error }, { count }] = await Promise.all([q, countQ]);
      if (error) return serverError(error.message);

      await logAudit(adminDb, {
        actor_id: uid,
        method: req.method,
        path: `${subPath}${url.search}`,
        action: "popups.list",
        response_count: (data ?? []).length,
        request: { search, limit, offset },
      });

      return json({ items: data ?? [], total: count ?? 0 });
    }

    if (req.method === "POST" && subPath === "/popups") {
      const body = (await req.json()) as Record<string, unknown>;
      const allowed = [
        "active",
        "kind",
        "title",
        "description",
        "cta_label",
        "svg_markup",
        "starts_at",
        "ends_at",
        "audience",
      ];
      const payload = pick(body, allowed);
      if (!payload.title || String(payload.title).trim() === "") return badRequest("title é obrigatório");

      const { data, error } = await adminDb
        .from("educational_popups")
        .insert({
          ...payload,
          title: String(payload.title).trim(),
        } as any)
        .select("id")
        .maybeSingle();
      if (error) return serverError(error.message);

      await logAudit(adminDb, {
        actor_id: uid,
        method: req.method,
        path: subPath,
        action: "popups.create",
        entity_type: "educational_popup",
        entity_id: data?.id ?? null,
        request: payload,
        response_count: 1,
      });

      return json({ id: data?.id });
    }

    if (req.method === "PATCH" && subPath.startsWith("/popups/")) {
      const id = subPath.split("/")[2];
      if (!id) return badRequest("missing id");
      const body = (await req.json()) as Record<string, unknown>;
      const allowed = [
        "active",
        "kind",
        "title",
        "description",
        "cta_label",
        "svg_markup",
        "starts_at",
        "ends_at",
        "audience",
      ];
      const patch = pick(body, allowed);

      const { data: before, error: beforeErr } = await adminDb
        .from("educational_popups")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (beforeErr) return serverError(beforeErr.message);

      if ("title" in patch && String((patch as any).title ?? "").trim() === "") {
        return badRequest("title não pode ser vazio");
      }
      if ("title" in patch) (patch as any).title = String((patch as any).title).trim();

      const { error } = await adminDb.from("educational_popups").update(patch as any).eq("id", id);
      if (error) return serverError(error.message);

      const { data: after } = await adminDb.from("educational_popups").select("*").eq("id", id).maybeSingle();

      await logAudit(adminDb, {
        actor_id: uid,
        method: req.method,
        path: subPath,
        action: "popups.update",
        entity_type: "educational_popup",
        entity_id: id,
        request: patch,
        before,
        after,
      });

      return json({ ok: true });
    }

    if (req.method === "POST" && subPath.startsWith("/popups/") && subPath.endsWith("/send")) {
      const id = subPath.split("/")[2];
      if (!id) return badRequest("missing id");

      const { data: before, error: beforeErr } = await adminDb
        .from("educational_popups")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (beforeErr) return serverError(beforeErr.message);
      if (!before) return badRequest("popup_not_found");

      const { count, error } = await adminDb
        .from("user_popup_dismissals")
        .delete({ count: "exact" })
        .eq("popup_id", id);
      if (error) return serverError(error.message);

      await logAudit(adminDb, {
        actor_id: uid,
        method: req.method,
        path: subPath,
        action: "popups.send",
        entity_type: "educational_popup",
        entity_id: id,
        before,
        request: { popup_id: id },
        response_count: count ?? null,
      });

      return json({ ok: true, reset_dismissals: count ?? 0 });
    }

    if (req.method === "DELETE" && subPath.startsWith("/popups/")) {
      const id = subPath.split("/")[2];
      if (!id) return badRequest("missing id");

      const { data: before, error: beforeErr } = await adminDb
        .from("educational_popups")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (beforeErr) return serverError(beforeErr.message);

      const { error } = await adminDb.from("educational_popups").delete().eq("id", id);
      if (error) return serverError(error.message);

      await logAudit(adminDb, {
        actor_id: uid,
        method: req.method,
        path: subPath,
        action: "popups.delete",
        entity_type: "educational_popup",
        entity_id: id,
        before,
      });

      return json({ ok: true });
    }

    // ----------------
    // GET /stats
    // ----------------
    if (req.method === "GET" && subPath === "/me") {
      await logAudit(adminDb, {
        actor_id: uid,
        method: req.method,
        path: subPath,
        action: "me.get",
        response_count: 1,
      });

      return json({ user_id: uid, is_admin: true });
    }

    if (req.method === "GET" && subPath === "/stats") {
      const [{ count: users }, { count: teams }, { count: trainings }, { count: verifiedEntities }] = await Promise.all([
        adminDb.from("profiles").select("id", { count: "exact", head: true }),
        adminDb.from("teams").select("id", { count: "exact", head: true }),
        adminDb.from("trainings").select("id", { count: "exact", head: true }),
        adminDb.from("verified_entities").select("id", { count: "exact", head: true }).eq("verified", true),
      ]);

      const payload = {
        users: users ?? 0,
        teams: teams ?? 0,
        trainings: trainings ?? 0,
        verifiedEntities: verifiedEntities ?? 0,
      };

      await logAudit(adminDb, {
        actor_id: uid,
        method: req.method,
        path: subPath,
        action: "stats.get",
        response_count: 1,
      });

      return json(payload);
    }

    // ----------------
    // GET /trainings
    // PATCH /trainings/:id
    // ----------------
    if (req.method === "GET" && subPath === "/trainings") {
      const search = url.searchParams.get("search") ?? "";
      const status = url.searchParams.get("status") ?? "";
      const game = url.searchParams.get("game") ?? "";
      const platform = url.searchParams.get("platform") ?? "";
      const from = url.searchParams.get("from") ?? "";
      const to = url.searchParams.get("to") ?? "";

      let q = adminDb
        .from("trainings")
        .select("id,name,organizer_id,game,platform,status,datetime,max_slots,is_private,deleted_at")
        .order("datetime", { ascending: false })
        .range(offset, offset + limit - 1);

      if (!includeDeleted) q = q.is("deleted_at", null);

      if (search.trim()) q = q.ilike("name", `%${search.trim()}%`);
      if (status.trim()) q = q.eq("status", status.trim());
      if (game.trim()) q = q.eq("game", game.trim());
      if (platform.trim()) q = q.eq("platform", platform.trim());
      if (from.trim()) q = q.gte("datetime", from.trim());
      if (to.trim()) q = q.lte("datetime", to.trim());

      const countQ = adminDb
        .from("trainings")
        .select("id", { count: "exact", head: true });

      let countQuery = countQ as any;
      if (!includeDeleted) countQuery = countQuery.is("deleted_at", null);
      if (search.trim()) countQuery = countQuery.ilike("name", `%${search.trim()}%`);
      if (status.trim()) countQuery = countQuery.eq("status", status.trim());
      if (game.trim()) countQuery = countQuery.eq("game", game.trim());
      if (platform.trim()) countQuery = countQuery.eq("platform", platform.trim());
      if (from.trim()) countQuery = countQuery.gte("datetime", from.trim());
      if (to.trim()) countQuery = countQuery.lte("datetime", to.trim());

      const [{ data, error }, { count }] = await Promise.all([q, countQuery]);
      if (error) return serverError(error.message);

      await logAudit(adminDb, {
        actor_id: uid,
        method: req.method,
        path: `${subPath}${url.search}`,
        action: "trainings.list",
        response_count: (data ?? []).length,
        request: { search, status, game, platform, from, to, limit, offset, includeDeleted },
      });

      return json({ items: data ?? [], total: count ?? 0 });
    }

    if (req.method === "PATCH" && subPath.startsWith("/trainings/")) {
      const id = subPath.split("/")[2];
      if (!id) return badRequest("missing id");

      const body = (await req.json()) as Record<string, unknown>;
      const allowed = [
        "name",
        "status",
        "datetime",
        "game",
        "platform",
        "mode",
        "max_slots",
        "is_private",
        "is_live",
        "discord_link",
        "whatsapp_link",
        "live_link",
        "important_info",
        "banner_url",
        "table_image_url",
        "prize",
      ];
      const patch = pick(body, allowed);

      const { data: before, error: beforeErr } = await adminDb
        .from("trainings")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (beforeErr) return serverError(beforeErr.message);

      const { error } = await adminDb.from("trainings").update(patch).eq("id", id);
      if (error) return serverError(error.message);

      const { data: after } = await adminDb.from("trainings").select("*").eq("id", id).maybeSingle();

      await logAudit(adminDb, {
        actor_id: uid,
        method: req.method,
        path: subPath,
        action: "trainings.update",
        entity_type: "training",
        entity_id: id,
        request: patch,
        before,
        after,
      });

      return json({ ok: true });
    }

    // Soft delete training
    if (req.method === "DELETE" && subPath.startsWith("/trainings/")) {
      const id = subPath.split("/")[2];
      if (!id) return badRequest("missing id");

      const { data: before, error: beforeErr } = await adminDb
        .from("trainings")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (beforeErr) return serverError(beforeErr.message);

      const { error } = await adminDb
        .from("trainings")
        .update({ deleted_at: new Date().toISOString(), deleted_by: uid })
        .eq("id", id);
      if (error) return serverError(error.message);

      const { data: after } = await adminDb.from("trainings").select("*").eq("id", id).maybeSingle();

      await logAudit(adminDb, {
        actor_id: uid,
        method: req.method,
        path: subPath,
        action: "trainings.delete",
        entity_type: "training",
        entity_id: id,
        before,
        after,
      });

      return json({ ok: true });
    }

    if (req.method === "POST" && subPath.startsWith("/trainings/") && subPath.endsWith("/restore")) {
      const id = subPath.split("/")[2];
      if (!id) return badRequest("missing id");

      const { data: before, error: beforeErr } = await adminDb
        .from("trainings")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (beforeErr) return serverError(beforeErr.message);

      const { error } = await adminDb
        .from("trainings")
        .update({ deleted_at: null, deleted_by: null })
        .eq("id", id);
      if (error) return serverError(error.message);

      const { data: after } = await adminDb.from("trainings").select("*").eq("id", id).maybeSingle();

      await logAudit(adminDb, {
        actor_id: uid,
        method: req.method,
        path: subPath,
        action: "trainings.restore",
        entity_type: "training",
        entity_id: id,
        before,
        after,
      });

      return json({ ok: true });
    }

    // ----------------
    // GET /teams
    // PATCH /teams/:id
    // ----------------
    if (req.method === "GET" && subPath === "/teams") {
      const search = url.searchParams.get("search") ?? "";

      let q = adminDb
        .from("teams")
        .select("id,name,tag,owner_id,is_verified,is_external,deleted_at")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (!includeDeleted) q = q.is("deleted_at", null);

      if (search.trim()) {
        const s = search.trim();
        q = q.or(`name.ilike.%${s}%,tag.ilike.%${s}%`);
      }

      const countQ = adminDb.from("teams").select("id", { count: "exact", head: true });
      let countQuery = countQ as any;
      if (!includeDeleted) countQuery = countQuery.is("deleted_at", null);
      if (search.trim()) {
        const s = search.trim();
        countQuery = countQuery.or(`name.ilike.%${s}%,tag.ilike.%${s}%`);
      }

      const [{ data, error }, { count }] = await Promise.all([q, countQuery]);
      if (error) return serverError(error.message);

      await logAudit(adminDb, {
        actor_id: uid,
        method: req.method,
        path: `${subPath}${url.search}`,
        action: "teams.list",
        response_count: (data ?? []).length,
        request: { search, limit, offset, includeDeleted },
      });

      return json({ items: data ?? [], total: count ?? 0 });
    }

    if (req.method === "PATCH" && subPath.startsWith("/teams/")) {
      const id = subPath.split("/")[2];
      if (!id) return badRequest("missing id");

      const body = (await req.json()) as Record<string, unknown>;

      // Default seguro: NÃO permitimos trocar owner_id via admin aqui.
      const allowed = [
        "name",
        "tag",
        "logo_url",
        "banner_url",
        "is_verified",
        "is_recruiting",
        "region",
        "platform",
        "discord_url",
        "twitter_url",
        "instagram_url",
        "youtube_url",
        "bio",
        "description",
        "primary_color",
        "secondary_color",
        "rating",
        "integrated_games",
      ];
      const patch = pick(body, allowed);

      const { data: before, error: beforeErr } = await adminDb
        .from("teams")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (beforeErr) return serverError(beforeErr.message);

      const { error } = await adminDb.from("teams").update(patch).eq("id", id);
      if (error) return serverError(error.message);

      const { data: after } = await adminDb.from("teams").select("*").eq("id", id).maybeSingle();

      await logAudit(adminDb, {
        actor_id: uid,
        method: req.method,
        path: subPath,
        action: "teams.update",
        entity_type: "team",
        entity_id: id,
        request: patch,
        before,
        after,
      });

      return json({ ok: true });
    }

    if (req.method === "DELETE" && subPath.startsWith("/teams/")) {
      const id = subPath.split("/")[2];
      if (!id) return badRequest("missing id");

      const { data: before, error: beforeErr } = await adminDb
        .from("teams")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (beforeErr) return serverError(beforeErr.message);

      const { error } = await adminDb
        .from("teams")
        .update({ deleted_at: new Date().toISOString(), deleted_by: uid })
        .eq("id", id);
      if (error) return serverError(error.message);

      const { data: after } = await adminDb.from("teams").select("*").eq("id", id).maybeSingle();

      await logAudit(adminDb, {
        actor_id: uid,
        method: req.method,
        path: subPath,
        action: "teams.delete",
        entity_type: "team",
        entity_id: id,
        before,
        after,
      });

      return json({ ok: true });
    }

    if (req.method === "POST" && subPath.startsWith("/teams/") && subPath.endsWith("/restore")) {
      const id = subPath.split("/")[2];
      if (!id) return badRequest("missing id");

      const { data: before, error: beforeErr } = await adminDb
        .from("teams")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (beforeErr) return serverError(beforeErr.message);

      const { error } = await adminDb
        .from("teams")
        .update({ deleted_at: null, deleted_by: null })
        .eq("id", id);
      if (error) return serverError(error.message);

      const { data: after } = await adminDb.from("teams").select("*").eq("id", id).maybeSingle();

      await logAudit(adminDb, {
        actor_id: uid,
        method: req.method,
        path: subPath,
        action: "teams.restore",
        entity_type: "team",
        entity_id: id,
        before,
        after,
      });

      return json({ ok: true });
    }

    // ----------------
    // GET /users
    // GET /users/:id
    // PATCH /users/:id
    // POST /users/:id/reset-username
    // ----------------
    if (req.method === "GET" && subPath === "/users") {
      const search = url.searchParams.get("search") ?? "";

      let q = adminDb
        .from("profiles")
        .select("id,full_name,username,preferred_language,available_for_team")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (search.trim()) {
        const s = search.trim();
        q = q.or(`full_name.ilike.%${s}%,username.ilike.%${s}%`);
      }

      const countQ = adminDb.from("profiles").select("id", { count: "exact", head: true });
      let countQuery = countQ as any;
      if (search.trim()) {
        const s = search.trim();
        countQuery = countQuery.or(`full_name.ilike.%${s}%,username.ilike.%${s}%`);
      }

      const [{ data, error }, { count }] = await Promise.all([q, countQuery]);
      if (error) return serverError(error.message);

      await logAudit(adminDb, {
        actor_id: uid,
        method: req.method,
        path: `${subPath}${url.search}`,
        action: "users.list",
        response_count: (data ?? []).length,
        request: { search, limit, offset },
      });

      return json({ items: data ?? [], total: count ?? 0 });
    }

    if (req.method === "GET" && subPath.startsWith("/users/") && subPath.split("/").length === 3) {
      const id = subPath.split("/")[2];
      if (!id) return badRequest("missing id");

      const { data, error } = await adminDb
        .from("profiles")
        .select(
          "id,full_name,username,avatar_url,banner_url,preferred_games,preferred_language,available_for_team,discord_contact,tracker_url,twitter_url,instagram_url,youtube_url,discord_url,player_function"
        )
        .eq("id", id)
        .maybeSingle();
      if (error) return serverError(error.message);
      if (!data) return json({ error: "not_found" }, { status: 404 });

      await logAudit(adminDb, {
        actor_id: uid,
        method: req.method,
        path: subPath,
        action: "users.get",
        entity_type: "profile",
        entity_id: id,
        response_count: 1,
      });

      return json(data as any);
    }

    if (req.method === "PATCH" && subPath.startsWith("/users/")) {
      const id = subPath.split("/")[2];
      if (!id) return badRequest("missing id");

      const body = (await req.json()) as Record<string, unknown>;

      // Default seguro: não mexer em roles aqui (roles ficam em user_roles).
      // Também NÃO permitir alterar username por padrão (pode habilitar depois se você quiser).
      const allowed = [
        "full_name",
        "avatar_url",
        "banner_url",
        "preferred_games",
        "preferred_language",
        "discord_contact",
        "tracker_url",
        "twitter_url",
        "instagram_url",
        "youtube_url",
        "discord_url",
        "available_for_team",
        "player_function",
      ];
      const patch = pick(body, allowed);

      const { data: before, error: beforeErr } = await adminDb
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (beforeErr) return serverError(beforeErr.message);

      const { error } = await adminDb.from("profiles").update(patch).eq("id", id);
      if (error) return serverError(error.message);

      const { data: after } = await adminDb.from("profiles").select("*").eq("id", id).maybeSingle();

      await logAudit(adminDb, {
        actor_id: uid,
        method: req.method,
        path: subPath,
        action: "users.update",
        entity_type: "profile",
        entity_id: id,
        request: patch,
        before,
        after,
      });

      return json({ ok: true });
    }

    if (
      req.method === "POST" &&
      subPath.startsWith("/users/") &&
      subPath.endsWith("/reset-username")
    ) {
      const id = subPath.split("/")[2];
      if (!id) return badRequest("missing id");

      const { data: before, error: beforeErr } = await adminDb
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (beforeErr) return serverError(beforeErr.message);

      const { error } = await adminDb
        .from("profiles")
        .update({ username: null })
        .eq("id", id);
      if (error) return serverError(error.message);

      const { data: after } = await adminDb.from("profiles").select("*").eq("id", id).maybeSingle();

      await logAudit(adminDb, {
        actor_id: uid,
        method: req.method,
        path: subPath,
        action: "users.reset_username",
        entity_type: "profile",
        entity_id: id,
        before,
        after,
      });

      return json({ ok: true });
    }

    // ----------------
    // GET /verifications
    // POST /verifications
    // ----------------
    if (req.method === "GET" && subPath === "/verifications") {
      const search = url.searchParams.get("search") ?? "";

      let q = adminDb
        .from("verified_entities")
        .select("entity_type,entity_id,verified")
        .order("updated_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (search.trim()) {
        q = q.ilike("entity_id", `%${search.trim()}%`);
      }

      const countQ = adminDb.from("verified_entities").select("entity_id", { count: "exact", head: true });
      let countQuery = countQ as any;
      if (search.trim()) countQuery = countQuery.ilike("entity_id", `%${search.trim()}%`);

      const [{ data, error }, { count }] = await Promise.all([q, countQuery]);
      if (error) return serverError(error.message);

      await logAudit(adminDb, {
        actor_id: uid,
        method: req.method,
        path: `${subPath}${url.search}`,
        action: "verifications.list",
        response_count: (data ?? []).length,
        request: { search, limit, offset },
      });

      return json({ items: data ?? [], total: count ?? 0 });
    }

    if (req.method === "POST" && subPath === "/verifications") {
      const body = (await req.json()) as Record<string, unknown>;
      const entity_type = String(body.entity_type ?? "");
      const entity_id = String(body.entity_id ?? "");
      const verified = Boolean(body.verified);
      const notes = body.notes ? String(body.notes) : null;

      if (!entity_type || !entity_id) return badRequest("entity_type e entity_id são obrigatórios");

      const payload = {
        entity_type,
        entity_id,
        verified,
        verified_at: verified ? new Date().toISOString() : null,
        verified_by: uid,
        notes,
      };

      // Prefer upsert se houver unique(entity_type, entity_id). Se não houver, fallback para update/insert.
      const upsertRes = await adminDb
        .from("verified_entities")
        .upsert(payload as any, { onConflict: "entity_type,entity_id" });

      if (upsertRes.error) {
        // fallback: tenta update, e se não achar, insert
        const { data: existing, error: exErr } = await adminDb
          .from("verified_entities")
          .select("id")
          .eq("entity_type", entity_type)
          .eq("entity_id", entity_id)
          .maybeSingle();
        if (exErr) return serverError(exErr.message);

        if (existing?.id) {
          const { error: updErr } = await adminDb
            .from("verified_entities")
            .update(payload as any)
            .eq("id", existing.id);
          if (updErr) return serverError(updErr.message);
        } else {
          const { error: insErr } = await adminDb.from("verified_entities").insert(payload as any);
          if (insErr) return serverError(insErr.message);
        }
      }

      await logAudit(adminDb, {
        actor_id: uid,
        method: req.method,
        path: subPath,
        action: "verifications.set",
        entity_type: entity_type,
        entity_id: entity_id,
        request: payload,
      });

      return json({ ok: true });
    }

    // ----------------
    // Admins management
    // GET /admins
    // POST /admins/grant { user_id }
    // POST /admins/revoke { user_id }
    // ----------------
    if (req.method === "GET" && subPath === "/admins") {
      const search = url.searchParams.get("search") ?? "";

      // Fetch admin roles
      let rolesQ = adminDb
        .from("user_roles")
        .select("user_id, role, assigned_at")
        .eq("role", "admin")
        .order("assigned_at", { ascending: false });

      const { data: roles, error: rolesErr } = await rolesQ;
      if (rolesErr) return serverError(rolesErr.message);

      const adminIds = (roles ?? []).map((r: any) => String(r.user_id));
      if (adminIds.length === 0) {
        await logAudit(adminDb, {
          actor_id: uid,
          method: req.method,
          path: `${subPath}${url.search}`,
          action: "admins.list",
          response_count: 0,
          request: { search, limit, offset },
        });
        return json({ items: [], total: 0 });
      }

      // Filter by profile when searching
      let filteredIds = adminIds;
      if (search.trim()) {
        const s = search.trim();
        const { data: profiles, error: profErr } = await adminDb
          .from("profiles")
          .select("id")
          .in("id", adminIds)
          .or(`full_name.ilike.%${s}%,username.ilike.%${s}%`);
        if (profErr) return serverError(profErr.message);
        filteredIds = (profiles ?? []).map((p: any) => String(p.id));
      }

      const total = filteredIds.length;
      const pageIds = filteredIds.slice(offset, offset + limit);

      const { data: pageProfiles, error: pageProfErr } = await adminDb
        .from("profiles")
        .select("id,full_name,username")
        .in("id", pageIds);
      if (pageProfErr) return serverError(pageProfErr.message);
      const profById = new Map((pageProfiles ?? []).map((p: any) => [String(p.id), p]));

      const roleById = new Map((roles ?? []).map((r: any) => [String(r.user_id), r]));
      const items = pageIds.map((id) => {
        const prof = profById.get(id);
        const roleRow = roleById.get(id);
        return {
          user_id: id,
          full_name: prof?.full_name ?? null,
          username: prof?.username ?? null,
          assigned_at: roleRow?.assigned_at ?? null,
        };
      });

      await logAudit(adminDb, {
        actor_id: uid,
        method: req.method,
        path: `${subPath}${url.search}`,
        action: "admins.list",
        response_count: items.length,
        request: { search, limit, offset },
      });

      return json({ items, total });
    }

    if (req.method === "POST" && subPath === "/admins/grant") {
      const body = (await req.json()) as Record<string, unknown>;
      const user_id = String(body.user_id ?? "");
      if (!user_id) return badRequest("user_id é obrigatório");

      const { error } = await adminDb
        .from("user_roles")
        .insert({ user_id, role: "admin", assigned_at: new Date().toISOString() } as any);
      if (error && !String(error.message).toLowerCase().includes("duplicate")) return serverError(error.message);

      await logAudit(adminDb, {
        actor_id: uid,
        method: req.method,
        path: subPath,
        action: "admins.grant",
        entity_type: "user",
        entity_id: user_id,
        request: { user_id },
      });

      return json({ ok: true });
    }

    if (req.method === "POST" && subPath === "/admins/revoke") {
      const body = (await req.json()) as Record<string, unknown>;
      const user_id = String(body.user_id ?? "");
      if (!user_id) return badRequest("user_id é obrigatório");
      if (user_id === uid) return badRequest("Não é permitido remover seu próprio admin");

      const { error } = await adminDb
        .from("user_roles")
        .delete()
        .eq("user_id", user_id)
        .eq("role", "admin");
      if (error) return serverError(error.message);

      await logAudit(adminDb, {
        actor_id: uid,
        method: req.method,
        path: subPath,
        action: "admins.revoke",
        entity_type: "user",
        entity_id: user_id,
        request: { user_id },
      });

      return json({ ok: true });
    }

    // ----------------
    // Audit logs list
    // GET /audit
    // ----------------
    if (req.method === "GET" && subPath === "/audit") {
      const search = url.searchParams.get("search") ?? "";
      const actor = url.searchParams.get("actor") ?? "";

      let q = adminDb
        .from("admin_audit_logs")
        .select("id,actor_id,method,path,action,entity_type,entity_id,response_count,created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (actor.trim()) q = q.eq("actor_id", actor.trim());
      if (search.trim()) {
        const s = search.trim();
        q = q.or(`path.ilike.%${s}%,action.ilike.%${s}%,entity_id.ilike.%${s}%`);
      }

      const { data, error, count } = await q;
      if (error) return serverError(error.message);

      // Também loga a leitura da auditoria
      await logAudit(adminDb, {
        actor_id: uid,
        method: req.method,
        path: `${subPath}${url.search}`,
        action: "audit.list",
        response_count: (data ?? []).length,
        request: { search, actor, limit, offset },
      });

      return json({ items: data ?? [], total: count ?? 0 });
    }

    return json({ error: "not_found" }, { status: 404 });
  } catch (e) {
    console.error("admin-api error", e);
    return serverError(String(e));
  }
});
