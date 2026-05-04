
-- Feedback submissions table
CREATE TABLE public.feedback_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  type text NOT NULL DEFAULT 'bug' CHECK (type IN ('bug','feature','confusion','other')),
  description text NOT NULL,
  screenshot_url text,
  page_url text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_progress','shipped','wont_do')),
  priority text NOT NULL DEFAULT 'unset' CHECK (priority IN ('unset','p0','p1','p2')),
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feedback_submissions ENABLE ROW LEVEL SECURITY;

-- Admin email helper (reuses founder allowlist)
CREATE OR REPLACE FUNCTION public.is_feedback_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce(auth.email(), '')) IN ('mandar@locum-ops.com','mr.mandarbandekar@gmail.com');
$$;

-- Authenticated users can insert their own feedback (fire-and-forget)
CREATE POLICY "Users can submit feedback"
ON public.feedback_submissions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins can read/update/delete all rows
CREATE POLICY "Admins can read all feedback"
ON public.feedback_submissions
FOR SELECT
TO authenticated
USING (public.is_feedback_admin());

CREATE POLICY "Admins can update all feedback"
ON public.feedback_submissions
FOR UPDATE
TO authenticated
USING (public.is_feedback_admin())
WITH CHECK (public.is_feedback_admin());

CREATE POLICY "Admins can delete all feedback"
ON public.feedback_submissions
FOR DELETE
TO authenticated
USING (public.is_feedback_admin());

CREATE INDEX idx_feedback_created_at ON public.feedback_submissions (created_at DESC);
CREATE INDEX idx_feedback_status ON public.feedback_submissions (status);

-- Storage bucket for screenshots (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('feedback-screenshots','feedback-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload to their own folder
CREATE POLICY "Users upload own feedback screenshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'feedback-screenshots'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins read all feedback screenshots"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'feedback-screenshots'
  AND public.is_feedback_admin()
);
