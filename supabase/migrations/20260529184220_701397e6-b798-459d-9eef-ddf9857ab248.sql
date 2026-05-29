-- Allow service_role to delete from email_send_log for retention cleanup
CREATE POLICY "Service role can delete send log"
ON public.email_send_log
FOR DELETE
USING (auth.role() = 'service_role');

-- Allow service_role to delete from suppressed_emails for resubscribe flows
CREATE POLICY "Service role can delete suppressed emails"
ON public.suppressed_emails
FOR DELETE
USING (auth.role() = 'service_role');

-- Allow feedback admins to delete files from feedback-screenshots bucket
CREATE POLICY "Admins can delete feedback screenshots"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'feedback-screenshots' AND public.is_feedback_admin());
