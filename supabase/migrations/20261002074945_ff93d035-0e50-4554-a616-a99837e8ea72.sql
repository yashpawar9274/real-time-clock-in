REVOKE ALL ON FUNCTION public.punch_in() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.punch_out() FROM PUBLIC, anon, authenticated;

CREATE POLICY "Users can delete own attendance photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'attendance-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);