-- Add batch column to profiles
ALTER TABLE public.profiles ADD COLUMN batch_number integer NOT NULL DEFAULT 1;

-- Add batch column to whitelist for import
ALTER TABLE public.whitelist ADD COLUMN batch_number integer NOT NULL DEFAULT 1;

-- Create quizzes table
CREATE TABLE public.quizzes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    questions jsonb NOT NULL DEFAULT '[]'::jsonb,
    points_per_question integer NOT NULL DEFAULT 1,
    created_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on quizzes
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

-- Create quiz_submissions table
CREATE TABLE public.quiz_submissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    material_id uuid NOT NULL REFERENCES public.course_materials(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    answers jsonb NOT NULL DEFAULT '{}'::jsonb,
    score integer NOT NULL DEFAULT 0,
    max_score integer NOT NULL DEFAULT 0,
    submitted_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on quiz_submissions
ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;

-- Add quiz_id column to course_materials
ALTER TABLE public.course_materials ADD COLUMN quiz_id uuid REFERENCES public.quizzes(id) ON DELETE SET NULL;

-- RLS policies for quizzes
CREATE POLICY "Admins can manage quizzes" ON public.quizzes
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view quizzes" ON public.quizzes
FOR SELECT USING (true);

-- RLS policies for quiz_submissions
CREATE POLICY "Users can insert their own submissions" ON public.quiz_submissions
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own submissions" ON public.quiz_submissions
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all submissions" ON public.quiz_submissions
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for quizzes updated_at
CREATE TRIGGER update_quizzes_updated_at
BEFORE UPDATE ON public.quizzes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();