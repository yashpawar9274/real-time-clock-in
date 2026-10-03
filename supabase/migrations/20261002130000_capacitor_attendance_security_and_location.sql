ALTER TABLE public.attendance
  ADD COLUMN latitude double precision,
  ADD COLUMN longitude double precision,
  ADD CONSTRAINT attendance_location_coordinates_check CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (
      latitude IS NOT NULL
      AND longitude IS NOT NULL
      AND latitude BETWEEN -90 AND 90
      AND longitude BETWEEN -180 AND 180
    )
  );

REVOKE INSERT, UPDATE, DELETE ON public.attendance FROM authenticated;
GRANT SELECT ON public.attendance TO authenticated;

CREATE OR REPLACE FUNCTION public.punch_in(_photo_path text)
RETURNS public.attendance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result public.attendance;
  actor_id uuid := auth.uid();
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Sign in is required';
  END IF;

  IF _photo_path IS NULL
    OR btrim(_photo_path) = ''
    OR split_part(_photo_path, '/', 1) <> actor_id::text THEN
    RAISE EXCEPTION 'A valid attendance photo is required';
  END IF;

  INSERT INTO public.attendance (user_id, work_date, check_in, photo_path)
  VALUES (actor_id, CURRENT_DATE, now(), _photo_path)
  RETURNING * INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.punch_in(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.punch_in(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.punch_in_with_location(
  _photo_path text,
  _latitude double precision,
  _longitude double precision
)
RETURNS public.attendance
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result public.attendance;
  actor_id uuid := auth.uid();
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Sign in is required';
  END IF;

  IF _photo_path IS NULL
    OR btrim(_photo_path) = ''
    OR split_part(_photo_path, '/', 1) <> actor_id::text THEN
    RAISE EXCEPTION 'A valid attendance photo is required';
  END IF;

  IF _latitude IS NULL OR _longitude IS NULL
    OR _latitude NOT BETWEEN -90 AND 90
    OR _longitude NOT BETWEEN -180 AND 180 THEN
    RAISE EXCEPTION 'A valid current location is required';
  END IF;

  INSERT INTO public.attendance (user_id, work_date, check_in, photo_path, latitude, longitude)
  VALUES (actor_id, CURRENT_DATE, now(), _photo_path, _latitude, _longitude)
  RETURNING * INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.punch_in_with_location(text, double precision, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.punch_in_with_location(text, double precision, double precision) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_set_attendance_status(
  _user_id uuid,
  _work_date date,
  _status text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Administrator access required';
  END IF;

  IF _work_date IS NULL OR _work_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Attendance cannot be set for a future date';
  END IF;

  IF _status IS NULL OR _status NOT IN ('present', 'absent', 'week_off') THEN
    RAISE EXCEPTION 'Invalid attendance status';
  END IF;

  IF _status = 'present' THEN
    DELETE FROM public.weekly_offs
    WHERE user_id = _user_id AND off_date = _work_date;

    INSERT INTO public.attendance (user_id, work_date, note)
    VALUES (_user_id, _work_date, 'Manual attendance by admin')
    ON CONFLICT (user_id, work_date) DO NOTHING;
  ELSIF _status = 'week_off' THEN
    DELETE FROM public.attendance
    WHERE user_id = _user_id AND work_date = _work_date;

    INSERT INTO public.weekly_offs (user_id, off_date, notes)
    VALUES (_user_id, _work_date, 'admin_week_off')
    ON CONFLICT (user_id, off_date) DO NOTHING;
  ELSE
    DELETE FROM public.attendance
    WHERE user_id = _user_id AND work_date = _work_date;

    DELETE FROM public.weekly_offs
    WHERE user_id = _user_id AND off_date = _work_date;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_attendance_status(uuid, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_attendance_status(uuid, date, text) TO authenticated, service_role;