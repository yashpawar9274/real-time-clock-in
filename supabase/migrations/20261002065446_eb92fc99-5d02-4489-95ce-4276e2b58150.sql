CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

ALTER POLICY "Users can read own profile or admins can read all" ON public.profiles
USING (id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
ALTER POLICY "Users can update own profile or admins can update all" ON public.profiles
USING (id = auth.uid() OR private.has_role(auth.uid(), 'admin'))
WITH CHECK (id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
ALTER POLICY "Users can read own role or admins can read all" ON public.user_roles
USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
ALTER POLICY "Users can read own attendance or admins can read all" ON public.attendance
USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
ALTER POLICY "Users can read own salary or admins can read all" ON public.salary_records
USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
ALTER POLICY "Admins can create salary records" ON public.salary_records
WITH CHECK (private.has_role(auth.uid(), 'admin'));
ALTER POLICY "Admins can update salary records" ON public.salary_records
USING (private.has_role(auth.uid(), 'admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin'));
ALTER POLICY "Admins can delete salary records" ON public.salary_records
USING (private.has_role(auth.uid(), 'admin'));

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
DROP FUNCTION public.has_role(uuid, public.app_role);