ALTER TABLE public.profiles
ADD COLUMN employee_code text UNIQUE;

CREATE OR REPLACE FUNCTION public.assign_employee_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.employee_code IS NULL OR btrim(NEW.employee_code) = '' THEN
    NEW.employee_code := 'OVH-' || upper(substr(replace(NEW.id::text, '-', ''), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER assign_employee_code_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.assign_employee_code();

UPDATE public.profiles
SET employee_code = 'OVH-' || upper(substr(replace(id::text, '-', ''), 1, 8))
WHERE employee_code IS NULL;

ALTER TABLE public.profiles ALTER COLUMN employee_code SET NOT NULL;

ALTER TABLE public.salary_records
ADD COLUMN attendance_days integer NOT NULL DEFAULT 0 CHECK (attendance_days >= 0),
ADD COLUMN working_days integer NOT NULL DEFAULT 0 CHECK (working_days >= 0);

CREATE OR REPLACE FUNCTION public.assign_designated_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE account_email text;
BEGIN
  account_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  IF account_email = 'omvaluehomes6@gmail.com' AND NEW.id = auth.uid() THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.assign_designated_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_designated_admin() TO service_role;

CREATE TRIGGER assign_designated_admin_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.assign_designated_admin();

CREATE OR REPLACE FUNCTION public.generate_monthly_salaries(_salary_month date DEFAULT (date_trunc('month', CURRENT_DATE) - interval '1 month')::date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  target_month date := date_trunc('month', _salary_month)::date;
  next_month date := (date_trunc('month', _salary_month) + interval '1 month')::date;
  inserted_count integer;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT private.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;

  INSERT INTO public.salary_records (
    user_id, salary_month, base_salary, deductions, bonuses,
    attendance_days, working_days, status
  )
  SELECT
    p.id,
    target_month,
    p.monthly_salary,
    0,
    0,
    count(a.id)::integer,
    (SELECT count(*)::integer
      FROM generate_series(target_month, next_month - 1, interval '1 day') d
      WHERE extract(isodow from d) < 7),
    'processed'::public.salary_status
  FROM public.profiles p
  LEFT JOIN public.attendance a
    ON a.user_id = p.id
   AND a.work_date >= target_month
   AND a.work_date < next_month
  WHERE p.is_active = true
  GROUP BY p.id, p.monthly_salary
  ON CONFLICT (user_id, salary_month) DO UPDATE
  SET base_salary = EXCLUDED.base_salary,
      attendance_days = EXCLUDED.attendance_days,
      working_days = EXCLUDED.working_days,
      updated_at = now()
  WHERE public.salary_records.status <> 'paid';

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;
REVOKE ALL ON FUNCTION public.generate_monthly_salaries(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_monthly_salaries(date) TO authenticated, service_role;