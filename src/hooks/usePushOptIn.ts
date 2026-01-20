import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from "@/lib/push";

export type PushStatus =
  | "unsupported"
  | "not-installed"
  | "blocked"
  | "prompt"
  | "granted"
  | "subscribed";

function getPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

async function getRegistration() {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.ready;
}

export function usePushOptIn(userId?: string) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<PushStatus>("unsupported");
  const [error, setError] = useState<string | null>(null);

  const supported = useMemo(() => {
    if (typeof window === "undefined") return false;
    return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    if (!supported) {
      setStatus("unsupported");
      setLoading(false);
      return;
    }

    const permission = getPermission();
    if (permission === "denied") {
      setStatus("blocked");
      setLoading(false);
      return;
    }

    if (!userId) {
      setStatus(permission === "granted" ? "granted" : "prompt");
      setLoading(false);
      return;
    }

    try {
      const registration = await getRegistration();
      if (!registration) {
        setStatus("not-installed");
        setLoading(false);
        return;
      }

      const sub = await registration.pushManager.getSubscription();
      if (!sub) {
        setStatus(permission === "granted" ? "granted" : "prompt");
        setLoading(false);
        return;
      }

      // Confirma se existe no banco (opcional) — se não existir, vamos registrar de novo.
      const endpoint = sub.endpoint;
      const { data, error: qErr } = await (supabase as any)
        .from("push_subscriptions")
        .select("id")
        .eq("user_id", userId)
        .eq("endpoint", endpoint)
        .maybeSingle();


      if (qErr) throw qErr;
      setStatus(data?.id ? "subscribed" : "granted");
    } catch (e: any) {
      console.error(e);
      setStatus(permission === "granted" ? "granted" : "prompt");
    } finally {
      setLoading(false);
    }
  }, [supported, userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const enable = useCallback(async () => {
    setError(null);
    if (!supported) {
      setStatus("unsupported");
      return false;
    }
    if (!userId) {
      setError("Você precisa estar logado para ativar.");
      return false;
    }
    if (!VAPID_PUBLIC_KEY) {
      setError(
        "Falta configurar a VAPID public key (necessária para registrar o subscription)."
      );
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "blocked" : "prompt");
        return false;
      }

      const registration = await getRegistration();
      if (!registration) {
        setStatus("not-installed");
        return false;
      }

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const json = sub.toJSON();
      const p256dh = (json as any)?.keys?.p256dh ?? null;
      const auth = (json as any)?.keys?.auth ?? null;

      const payload = {
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh,
        auth,
        expiration_time: json.expirationTime ?? null,
        user_agent: navigator.userAgent,
      };

      const { error: upErr } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("push_subscriptions" as any)
        .upsert(payload, { onConflict: "endpoint" });

      if (upErr) throw upErr;

      setStatus("subscribed");
      return true;
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Falha ao ativar notificações.");
      return false;
    } finally {
      refresh();
    }
  }, [refresh, supported, userId]);

  const disable = useCallback(async () => {
    setError(null);
    if (!supported) return true;

    try {
      const registration = await getRegistration();
      const sub = await registration?.pushManager.getSubscription();

      if (sub) {
        await sub.unsubscribe();
        if (userId) {
          await supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .from("push_subscriptions" as any)
            .delete()
            .eq("user_id", userId)
            .eq("endpoint", sub.endpoint);
        }
      }

      const permission = getPermission();
      setStatus(permission === "granted" ? "granted" : "prompt");
      return true;
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Falha ao desativar.");
      return false;
    } finally {
      refresh();
    }
  }, [refresh, supported, userId]);

  return {
    loading,
    status,
    error,
    supported,
    enable,
    disable,
    refresh,
  };
}
