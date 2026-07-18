import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Business } from "@/types/storefront";

export function useBusinessQuery(slug: string) {
  return useQuery({
    queryKey: ["sf-business", slug],
    queryFn: async (): Promise<Business> => {
      const { data, error } = await (supabase as any)
        .from("businesses")
        .select("id, name, slug, logo_url, currency, whatsapp_phone, settings")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Business not found");
      return data as Business;
    },
  });
}
