// Integration-managed protected layout. SSR off because Supabase session
// lives in localStorage. Redirects to /auth when there is no user.
// Redirects to /onboarding if onboarding is not completed.
import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthGuard,
});

function AuthGuard() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session?.user) {
        router.navigate({ to: "/auth" });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", data.session.user.id)
        .maybeSingle();
      if (!profile?.onboarding_completed) {
        router.navigate({ to: "/onboarding" });
        return;
      }
      setReady(true);
    });
  }, [router]);

  if (!ready) return null;
  return <Outlet />;
}