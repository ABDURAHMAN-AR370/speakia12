
-- 1. Add `is_blocked` column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;

-- 2. Change whitelist to store phone numbers instead of emails (add phone_number column)
ALTER TABLE public.whitelist ADD COLUMN IF NOT EXISTS phone_number text;

-- 3. Create applications table for referral landing page
CREATE TABLE IF NOT EXISTS public.applications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name text NOT NULL,
  place text NOT NULL,
  gender text NOT NULL,
  age integer NOT NULL,
  whatsapp_number text NOT NULL,
  screenshot_url text,
  referred_by_code text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Anyone can insert an application
CREATE POLICY "Anyone can submit application"
  ON public.applications FOR INSERT
  WITH CHECK (true);

-- Only admins can view applications
CREATE POLICY "Admins can view applications"
  ON public.applications FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Update RLS on whitelist to allow UPDATE for admins
CREATE POLICY "Admins can update whitelist"
  ON public.whitelist FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));
