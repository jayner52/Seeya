-- Migration: Add trip update notifications
-- Notifies participants when trip name, start_date, or end_date changes

-- 1. Add trip_updated to notification_type enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'trip_updated';

-- 2. Create trigger function for trip updates
CREATE OR REPLACE FUNCTION public.handle_trip_update_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  editor_name TEXT;
  change_description TEXT;
BEGIN
  -- Only fire on meaningful changes
  IF NEW.name IS NOT DISTINCT FROM OLD.name
     AND NEW.start_date IS NOT DISTINCT FROM OLD.start_date
     AND NEW.end_date IS NOT DISTINCT FROM OLD.end_date THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT COALESCE(full_name, username, 'Someone') INTO editor_name
    FROM public.profiles WHERE id = current_setting('request.jwt.claims', true)::json->>'sub';

    -- Build change description
    IF NEW.name IS DISTINCT FROM OLD.name THEN
      change_description := 'renamed trip to "' || COALESCE(NEW.name, 'Untitled') || '"';
    ELSIF NEW.start_date IS DISTINCT FROM OLD.start_date OR NEW.end_date IS DISTINCT FROM OLD.end_date THEN
      change_description := 'updated dates for "' || COALESCE(NEW.name, 'a trip') || '"';
    END IF;

    -- Notify trip owner (if not the editor)
    INSERT INTO public.notifications (user_id, type, title, message, from_user_id, trip_id)
    SELECT NEW.user_id, 'trip_updated', 'Trip Updated',
           editor_name || ' ' || change_description,
           (current_setting('request.jwt.claims', true)::json->>'sub')::uuid,
           NEW.id
    FROM public.user_settings us
    WHERE us.user_id = NEW.user_id
      AND NEW.user_id != (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND COALESCE(us.notify_trip_invitations, true) = true
    UNION ALL
    -- Also notify owner if they have no user_settings row (default = true)
    SELECT NEW.user_id, 'trip_updated', 'Trip Updated',
           editor_name || ' ' || change_description,
           (current_setting('request.jwt.claims', true)::json->>'sub')::uuid,
           NEW.id
    WHERE NEW.user_id != (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND NOT EXISTS (SELECT 1 FROM public.user_settings us WHERE us.user_id = NEW.user_id);

    -- Notify all confirmed/maybe participants (except the editor, respecting preferences)
    INSERT INTO public.notifications (user_id, type, title, message, from_user_id, trip_id)
    SELECT tp.user_id, 'trip_updated', 'Trip Updated',
           editor_name || ' ' || change_description,
           (current_setting('request.jwt.claims', true)::json->>'sub')::uuid,
           NEW.id
    FROM public.trip_participants tp
    LEFT JOIN public.user_settings us ON us.user_id = tp.user_id
    WHERE tp.trip_id = NEW.id
      AND tp.status IN ('confirmed', 'maybe')
      AND tp.user_id != (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND COALESCE(us.notify_trip_invitations, true) = true;

  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

-- 3. Create trigger on trips table
DROP TRIGGER IF EXISTS on_trip_updated ON public.trips;
CREATE TRIGGER on_trip_updated
  AFTER UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_trip_update_notification();
