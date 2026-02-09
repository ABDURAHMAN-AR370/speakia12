-- Allow users to update their own form submissions (for editing responses)
CREATE POLICY "Users can update their own submissions"
ON public.form_submissions
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
