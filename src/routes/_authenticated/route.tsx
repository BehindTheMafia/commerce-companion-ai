import { createFileRoute, Outlet, useRouter } from "@tanstack/react-router";
import { motion } from "motion/react";
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
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 0.61, 0.36, 1] }}
    >
      <Outlet />
    </motion.div>
  );
}