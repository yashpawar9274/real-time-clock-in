CREATE TABLE public.admin_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'web',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_push_tokens_platform_check CHECK (platform IN ('web', 'android'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_push_tokens TO authenticated;
GRANT ALL ON public.admin_push_tokens TO service_role;

ALTER TABLE public.admin_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read own push tokens"
ON public.admin_push_tokens FOR SELECT TO authenticated
USING (user_id = auth.uid() AND private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can register own push tokens"
ON public.admin_push_tokens FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update own push tokens"
ON public.admin_push_tokens FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (user_id = auth.uid() AND private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can remove own push tokens"
ON public.admin_push_tokens FOR DELETE TO authenticated
USING (user_id = auth.uid() AND private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER update_admin_push_tokens_updated_at
BEFORE UPDATE ON public.admin_push_tokens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();