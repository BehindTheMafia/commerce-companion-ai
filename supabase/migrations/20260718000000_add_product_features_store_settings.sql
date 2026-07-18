
-- ============ PRODUCT FEATURES & STORE SETTINGS ============
-- Adds pricing_modes (JSONB), specifications (JSONB), extended info TEXT,
-- product_variants + product_variant_values tables, and settings JSONB on businesses.

-- 1. JSONB columns on products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS pricing_modes JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS specifications JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS shipping_info TEXT,
  ADD COLUMN IF NOT EXISTS warranty_info TEXT,
  ADD COLUMN IF NOT EXISTS wholesale_info TEXT;

-- 2. Product Variants
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'pill',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants(product_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;
GRANT SELECT ON public.product_variants TO anon;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pv public read" ON public.product_variants FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.status = 'active'));
CREATE POLICY "pv auth read" ON public.product_variants FOR SELECT TO authenticated USING (true);
CREATE POLICY "pv member write" ON public.product_variants FOR ALL TO authenticated
  USING (public.has_business_role((SELECT p.business_id FROM public.products p WHERE p.id = product_id), ARRAY['owner','admin','staff']::public.membership_role[]))
  WITH CHECK (public.has_business_role((SELECT p.business_id FROM public.products p WHERE p.id = product_id), ARRAY['owner','admin','staff']::public.membership_role[]));
CREATE TRIGGER trg_product_variants_updated BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE IF NOT EXISTS public.product_variant_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id UUID NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  image_url TEXT,
  available BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_product_variant_values_variant ON public.product_variant_values(variant_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variant_values TO authenticated;
GRANT ALL ON public.product_variant_values TO service_role;
GRANT SELECT ON public.product_variant_values TO anon;
ALTER TABLE public.product_variant_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pvv public read" ON public.product_variant_values FOR SELECT TO anon USING (true);
CREATE POLICY "pvv auth read" ON public.product_variant_values FOR SELECT TO authenticated USING (true);
CREATE POLICY "pvv member write" ON public.product_variant_values FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.product_variants pv JOIN public.products p ON p.id = pv.product_id WHERE pv.id = variant_id AND public.has_business_role(p.business_id, ARRAY['owner','admin','staff']::public.membership_role[])))
  WITH CHECK (EXISTS (SELECT 1 FROM public.product_variants pv JOIN public.products p ON p.id = pv.product_id WHERE pv.id = variant_id AND public.has_business_role(p.business_id, ARRAY['owner','admin','staff']::public.membership_role[])));

-- 3. Settings JSONB on businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
