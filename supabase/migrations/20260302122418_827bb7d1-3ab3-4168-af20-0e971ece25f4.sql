-- Allow admins to update quiz_submissions (for grace marks)
CREATE POLICY "Admins can update submissions"
ON public.quiz_submissions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
