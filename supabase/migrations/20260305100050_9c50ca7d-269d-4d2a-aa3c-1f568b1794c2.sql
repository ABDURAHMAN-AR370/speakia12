ALTER TABLE public.whitelist ADD COLUMN IF NOT EXISTS referred_by text DEFAULT NULL;
ALTER TABLE public.whitelist ADD COLUMN IF NOT EXISTS signup_source text DEFAULT NULL;