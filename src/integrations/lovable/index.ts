// Google OAuth via Supabase direct
import { supabase } from "../supabase/client";
import type { Provider } from "@supabase/supabase-js";

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: Provider) => {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin + "/auth",
        },
      });
      if (error) return { error };
      if (data?.url) {
        window.location.href = data.url;
        return { redirected: true };
      }
      return { error: new Error("No se pudo iniciar el flujo OAuth") };
    },
  },
};