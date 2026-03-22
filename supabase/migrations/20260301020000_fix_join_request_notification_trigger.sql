CREATE OR REPLACE FUNCTION public.handle_join_request_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  trip_name TEXT;
  trip_owner_id UUID;
  requester_name TEXT;
BEGIN
  IF NEW.status = 'pending' THEN
    BEGIN
      SELECT name, user_id INTO trip_name, trip_owner_id
      FROM public.trips WHERE id = NEW.trip_id;

      SELECT COALESCE(full_name, username, 'Someone') INTO requester_name
      FROM public.profiles WHERE id = NEW.user_id;

      INSERT INTO public.notifications (user_id, type, title, message, from_user_id, trip_id)
      VALUES (
        trip_owner_id,
        'join_request',
        'Join Request',
        requester_name || ' requested to join "' || COALESCE(trip_name, 'a trip') || '"',
        NEW.user_id,
        NEW.trip_id
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;
