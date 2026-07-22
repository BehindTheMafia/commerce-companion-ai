import { supabase } from "../supabase/client";
import type { Provider } from "@supabase/supabase-js";

const OAUTH_REDIRECT = window.location.origin + "/auth";

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: Provider) => {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: OAUTH_REDIRECT },
      });
      if (error) return { error };
      if (data?.url) {
        window.location.href = data.url;
        return { redirected: true };
      }
      return { error: new Error("No se pudo iniciar el flujo OAuth") };
    },

    signInWithOAuthPopup: async (provider: Provider) => {
      const w = 520;
      const h = 650;

      const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
      const dualScreenTop = window.screenTop !== undefined ? window.screenTop : window.screenY;

      const width = window.innerWidth
        ? window.innerWidth
        : document.documentElement.clientWidth
          ? document.documentElement.clientWidth
          : screen.width;
      const height = window.innerHeight
        ? window.innerHeight
        : document.documentElement.clientHeight
          ? document.documentElement.clientHeight
          : screen.height;

      const left = Math.max(0, Math.floor((width - w) / 2 + dualScreenLeft));
      const top = Math.max(0, Math.floor((height - h) / 2 + dualScreenTop));

      const popup = window.open(
        "about:blank",
        "google-auth-popup",
        `width=${w},height=${h},top=${top},left=${left},scrollbars=yes,resizable=yes`
      );

      if (!popup) {
        const { data } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: OAUTH_REDIRECT },
        });
        if (data?.url) window.location.href = data.url;
        return { redirected: true };
      }

      if (popup) {
        popup.focus();
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: OAUTH_REDIRECT,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        popup.close();
        return { error };
      }

      if (data?.url) {
        popup.location.href = data.url;
        return { redirected: true };
      }

      popup.close();
      return { error: new Error("No se pudo iniciar el flujo OAuth") };
    },
  },
};