CREATE OR REPLACE FUNCTION public.protect_profile_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, private
AS $$
BEGIN
  IF private.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.id <> auth.uid()
      OR NEW.monthly_salary <> 0
      OR NEW.department IS NOT NULL
      OR NEW.job_title IS NOT NULL
      OR NEW.joining_date IS NOT NULL
      OR NEW.is_active IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'Only administrators can set employment and salary details';
    END IF;
  ELSE
    IF NEW.id <> OLD.id
      OR NEW.monthly_salary IS DISTINCT FROM OLD.monthly_salary
      OR NEW.department IS DISTINCT FROM OLD.department
      OR NEW.job_title IS DISTINCT FROM OLD.job_title
      OR NEW.joining_date IS DISTINCT FROM OLD.joining_date
      OR NEW.is_active IS DISTINCT FROM OLD.is_active THEN
      RAISE EXCEPTION 'Only administrators can change employment and salary details';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_profile_admin_fields_trigger
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_admin_fields();