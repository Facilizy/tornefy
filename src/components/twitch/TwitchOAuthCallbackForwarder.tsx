import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * If Twitch OAuth ends up redirecting back to our SPA with `code/state/scope` in the URL,
 * forward the browser to the Edge Function callback so it can exchange the code and
 * persist the connection server-side.
 */
export function TwitchOAuthCallbackForwarder() {
  const location = useLocation();

  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const hasTwitchParams = sp.has("code") && sp.has("state") && sp.has("scope");
    if (!hasTwitchParams) return;

    const supabaseUrl = (supabase as any)?.supabaseUrl as string | undefined;
    if (!supabaseUrl) return;

    const target = `${supabaseUrl}/functions/v1/twitch-oauth-callback${location.search}`;
    window.location.replace(target);
  }, [location.search]);

  return null;
}
