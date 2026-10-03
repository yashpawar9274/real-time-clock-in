CREATE TABLE IF NOT EXISTS public.weekly_offs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  off_date date NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, off_date)
);

ALTER TABLE public.weekly_offs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own weekly offs"
ON public.weekly_offs FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create own weekly offs"
ON public.weekly_offs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own weekly offs"
ON public.weekly_offs FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own weekly offs"
ON public.weekly_offs FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all weekly offs"
ON public.weekly_offs FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
  )
);

CREATE OR REPLACE FUNCTION public.generate_monthly_salaries(_salary_month date DEFAULT (date_trunc('month', CURRENT_DATE) - interval '1 month')::date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  target_month date := date_trunc('month', _salary_month)::date;
  next_month date := (date_trunc('month', _salary_month) + interval '1 month')::date;
  month_length integer;
  inserted_count integer;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT private.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;

  month_length := EXTRACT(DAY FROM (next_month - interval '1 day'))::int;

  INSERT INTO public.salary_records (
    user_id,
    salary_month,
    base_salary,
    deductions,
    bonuses,
    attendance_days,
    working_days,
    net_salary,
    status
  )
  SELECT
    p.id,
    target_month,
    p.monthly_salary,
    ROUND(COALESCE((payroll_calc.absent_days + payroll_calc.extra_week_off_days) * (p.monthly_salary / 30), 0)::numeric, 2),
    0,
    COALESCE(attendance_summary.attendance_days, 0)::integer,
    month_length,
    ROUND(
      p.monthly_salary - COALESCE((payroll_calc.absent_days + payroll_calc.extra_week_off_days) * (p.monthly_salary / 30), 0),
      2
    ),
    'processed'::public.salary_status
  FROM public.profiles p
  LEFT JOIN (
    SELECT a.user_id, count(*)::integer AS attendance_days
    FROM public.attendance a
    WHERE a.work_date >= target_month
      AND a.work_date < next_month
    GROUP BY a.user_id
  ) attendance_summary ON attendance_summary.user_id = p.id
  LEFT JOIN (
    SELECT w.user_id, count(*)::integer AS week_off_days
    FROM public.weekly_offs w
    WHERE w.off_date >= target_month
      AND w.off_date < next_month
    GROUP BY w.user_id
  ) week_off_summary ON week_off_summary.user_id = p.id
  CROSS JOIN LATERAL (
    SELECT
      GREATEST(0, month_length - COALESCE(attendance_summary.attendance_days, 0) - COALESCE(week_off_summary.week_off_days, 0)) AS absent_days,
      GREATEST(0, COALESCE(week_off_summary.week_off_days, 0) - 4) AS extra_week_off_days
  ) payroll_calc
  WHERE p.is_active = true
  ON CONFLICT (user_id, salary_month) DO UPDATE
  SET base_salary = EXCLUDED.base_salary,
      deductions = EXCLUDED.deductions,
      bonuses = EXCLUDED.bonuses,
      attendance_days = EXCLUDED.attendance_days,
      working_days = EXCLUDED.working_days,
      net_salary = EXCLUDED.net_salary,
      status = EXCLUDED.status,
      updated_at = now()
  WHERE public.salary_records.status <> 'paid';

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_monthly_salaries(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_monthly_salaries(date) TO authenticated, service_role;
