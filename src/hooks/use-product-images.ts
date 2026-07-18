import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProductImage } from "@/types/storefront";

export function useProductImages(productId: string | undefined) {
  return useQuery({
    queryKey: ["sf-product-images", productId],
    enabled: !!productId,
    queryFn: async (): Promise<ProductImage[]> => {
      const { data } = await supabase
        .from("product_images")
        .select("id, product_id, url, alt, sort_order")
        .eq("product_id", productId!)
        .order("sort_order", { ascending: true });
      return data ?? [];
    },
  });
}
