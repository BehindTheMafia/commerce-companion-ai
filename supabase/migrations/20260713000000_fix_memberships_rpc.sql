-- Function to get businesses the current user belongs to (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_my_businesses()
RETURNS TABLE (id uuid, name text, slug text, logo_url text, currency text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id, b.name, b.slug, b.logo_url, b.currency
  FROM public.businesses b
  INNER JOIN public.memberships m ON m.business_id = b.id
  WHERE m.user_id = auth.uid()
  ORDER BY m.created_at;
$$;

-- Fix memberships policy to not rely on has_business_role (EXECUTE was revoked)
DROP POLICY IF EXISTS "memberships read own" ON public.memberships;
CREATE POLICY "memberships read own" ON public.memberships
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());