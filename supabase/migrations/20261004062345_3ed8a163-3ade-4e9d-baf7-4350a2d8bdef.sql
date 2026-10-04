ALTER TABLE public.attendance
ADD COLUMN push_notified_at timestamptz;

REVOKE UPDATE (push_notified_at) ON public.attendance FROM authenticated;
GRANT UPDATE (push_notified_at) ON public.attendance TO service_role;