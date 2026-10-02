CREATE OR REPLACE FUNCTION public.generate_monthly_salaries(_salary_month date DEFAULT (date_trunc('month', CURRENT_DATE) - interval '1 month')::date)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
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
    p.id, target_month, p.monthly_salary, 0, 0,
    count(a.id)::integer,
    (SELECT count(*)::integer FROM generate_series(target_month, next_month - 1, interval '1 day') d WHERE extract(isodow from d) < 7),
    'processed'::public.salary_status
  FROM public.profiles p
  LEFT JOIN public.attendance a ON a.user_id = p.id AND a.work_date >= target_month AND a.work_date < next_month
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