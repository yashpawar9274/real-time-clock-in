GRANT SELECT ON public.attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_offs TO authenticated;

CREATE POLICY "Admins can manage all attendance"
ON public.attendance FOR ALL TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
    AND NOT (SELECT puballtables FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'attendance'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'weekly_offs'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.weekly_offs;
    END IF;
  END IF;
END;
$$;