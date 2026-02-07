-- Create hero_slides table for admin-managed homepage carousel
CREATE TABLE public.hero_slides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  media_url TEXT NOT NULL,
  title TEXT,
  subtitle TEXT,
  display_duration INTEGER NOT NULL DEFAULT 5, -- seconds for images, ignored for videos (plays until end)
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

-- Public can view active slides
CREATE POLICY "Anyone can view active slides"
ON public.hero_slides
FOR SELECT
USING (is_active = true);

-- Admins can manage all slides
CREATE POLICY "Admins can manage slides"
ON public.hero_slides
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for hero media
INSERT INTO storage.buckets (id, name, public) VALUES ('hero-media', 'hero-media', true);

-- Storage policies for hero media
CREATE POLICY "Anyone can view hero media"
ON storage.objects FOR SELECT
USING (bucket_id = 'hero-media');

CREATE POLICY "Admins can upload hero media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'hero-media' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update hero media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'hero-media' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete hero media"
ON storage.objects FOR DELETE
USING (bucket_id = 'hero-media' AND has_role(auth.uid(), 'admin'::app_role));