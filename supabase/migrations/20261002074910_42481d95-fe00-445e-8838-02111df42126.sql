ALTER TABLE public.attendance
  ADD COLUMN photo_path text;

CREATE OR REPLACE FUNCTION public.punch_in(_photo_path text)
RETURNS public.attendance
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE result public.attendance;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in is required';
  END IF;

  IF _photo_path IS NULL
    OR btrim(_photo_path) = ''
    OR split_part(_photo_path, '/', 1) <> auth.uid()::text THEN
    RAISE EXCEPTION 'A valid live attendance photo is required';
  END IF;

  INSERT INTO public.attendance (user_id, work_date, check_in, photo_path)
  VALUES (auth.uid(), CURRENT_DATE, now(), _photo_path)
  RETURNING * INTO result;
  RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION public.punch_in(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.punch_in(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.punch_in(text) TO service_role;

CREATE POLICY "Users can upload own attendance photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'attendance-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users and admins can view attendance photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'attendance-photos'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR private.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'attendance'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
  END IF;
END
$do$;