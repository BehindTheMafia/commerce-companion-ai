import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/go/$slug")({
  component: GoPage,
});

const STORAGE_KEY = "commerce_ai_active_business";

function GoPage() {
  const { slug } = useParams({ from: "/go/$slug" });
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session?.user) {
        navigate({ to: "/auth" });
        return;
      }
      const { data: biz } = await supabase
        .from("businesses")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (biz) {
        localStorage.setItem(STORAGE_KEY, biz.id);
      }
      navigate({ to: "/app" });
    });
  }, [slug, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <Sparkles className="size-6" />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Redirigiendo...</p>
        <Loader2 className="mx-auto mt-2 size-4 animate-spin text-muted-foreground" />
      </div>
    </div>
  );
}