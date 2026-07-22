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
      const popup = window.open("", "google-auth", "width=600,height=700");
      if (!popup) {
        return { error: new Error("Pop-up bloqueado. Permite ventanas emergentes e intenta de nuevo.") };
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: OAUTH_REDIRECT },
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