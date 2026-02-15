
-- Settings table for admin configuration (e.g., total_days)
CREATE TABLE public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Admins can insert settings" ON public.settings FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update settings" ON public.settings FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete settings" ON public.settings FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default total_days
INSERT INTO public.settings (key, value) VALUES ('total_days', '30');

-- Password reset key on whitelist
ALTER TABLE public.whitelist ADD COLUMN IF NOT EXISTS password_reset_enabled boolean NOT NULL DEFAULT false;

-- Referral code, referred_by, signup_source on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signup_source text;

-- Min completion time on course_materials (in seconds, 0 = no minimum)
ALTER TABLE public.course_materials ADD COLUMN IF NOT EXISTS min_completion_time integer NOT NULL DEFAULT 0;
