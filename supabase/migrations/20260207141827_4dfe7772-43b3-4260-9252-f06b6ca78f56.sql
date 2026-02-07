-- Drop the existing check constraint
ALTER TABLE public.course_materials DROP CONSTRAINT IF EXISTS course_materials_material_type_check;

-- Add new check constraint that includes form and quiz types
ALTER TABLE public.course_materials ADD CONSTRAINT course_materials_material_type_check 
CHECK (material_type IN ('image', 'video', 'audio', 'link', 'form', 'quiz'));