-- Allow authenticated users to read businesses (needed for slug check + listing)
CREATE POLICY "businesses auth read" ON public.businesses
  FOR SELECT TO authenticated USING (true);

-- Add onboarding_completed column if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;