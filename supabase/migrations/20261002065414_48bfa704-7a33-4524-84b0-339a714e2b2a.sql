CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
CREATE TYPE public.salary_status AS ENUM ('draft', 'processed', 'paid');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL DEFAULT '',
  phone text,
  department text,
  job_title text,
  joining_date date,
  monthly_salary numeric(12,2) NOT NULL DEFAULT 0 CHECK (monthly_salary >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'staff',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  work_date date NOT NULL DEFAULT CURRENT_DATE,
  check_in timestamptz NOT NULL DEFAULT now(),
  check_out timestamptz,
  note text CHECK (char_length(note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, work_date),
  CHECK (check_out IS NULL OR check_out >= check_in)
);
GRANT SELECT ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.salary_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  salary_month date NOT NULL CHECK (salary_month = date_trunc('month', salary_month)::date),
  base_salary numeric(12,2) NOT NULL CHECK (base_salary >= 0),
  deductions numeric(12,2) NOT NULL DEFAULT 0 CHECK (deductions >= 0),
  bonuses numeric(12,2) NOT NULL DEFAULT 0 CHECK (bonuses >= 0),
  net_salary numeric(12,2) GENERATED ALWAYS AS (base_salary - deductions + bonuses) STORED,
  status public.salary_status NOT NULL DEFAULT 'draft',
  paid_at timestamptz,
  notes text CHECK (char_length(notes) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, salary_month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.salary_records TO authenticated;
GRANT ALL ON public.salary_records TO service_role;
ALTER TABLE public.salary_records ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
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
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE POLICY "Users can read own profile or admins can read all"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update own profile or admins can update all"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own role or admins can read all"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create their staff role"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND role = 'staff');

CREATE POLICY "Users can read own attendance or admins can read all"
ON public.attendance FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own salary or admins can read all"
ON public.salary_records FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can create salary records"
ON public.salary_records FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update salary records"
ON public.salary_records FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete salary records"
ON public.salary_records FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_salary_records_updated_at BEFORE UPDATE ON public.salary_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.punch_in()
RETURNS public.attendance
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE result public.attendance;
BEGIN
  INSERT INTO public.attendance (user_id, work_date, check_in)
  VALUES (auth.uid(), CURRENT_DATE, now())
  RETURNING * INTO result;
  RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.punch_in() TO authenticated;

CREATE OR REPLACE FUNCTION public.punch_out()
RETURNS public.attendance
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE result public.attendance;
BEGIN
  UPDATE public.attendance
  SET check_out = now()
  WHERE user_id = auth.uid()
    AND work_date = CURRENT_DATE
    AND check_out IS NULL
  RETURNING * INTO result;
  IF result.id IS NULL THEN
    RAISE EXCEPTION 'No active attendance record found for today';
  END IF;
  RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.punch_out() TO authenticated;

CREATE POLICY "Users can punch in for themselves"
ON public.attendance FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can punch out for themselves"
ON public.attendance FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE INDEX attendance_user_date_idx ON public.attendance (user_id, work_date DESC);
CREATE INDEX attendance_work_date_idx ON public.attendance (work_date DESC);
CREATE INDEX salary_records_user_month_idx ON public.salary_records (user_id, salary_month DESC);
CREATE INDEX user_roles_user_id_idx ON public.user_roles (user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;