-- Fix notification trigger: null message when user has no name set.
-- COALESCE(full_name, username) can return NULL if both columns are null,
-- causing string concat to produce a null message that violates the NOT NULL constraint.
-- Also ensures exception handling is in place so notification failures never block participant creation.

CREATE OR REPLACE FUNCTION public.handle_trip_participant_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trip_name TEXT;
  trip_owner_id UUID;
  from_user_name TEXT;
BEGIN
  SELECT name, user_id INTO trip_name, trip_owner_id
  FROM public.trips WHERE id = NEW.trip_id;

  IF TG_OP = 'INSERT' THEN
    IF NEW.user_id != trip_owner_id THEN
      BEGIN
        SELECT COALESCE(full_name, username, 'Someone') INTO from_user_name
        FROM public.profiles WHERE id = trip_owner_id;

        INSERT INTO public.notifications (user_id, type, title, message, from_user_id, trip_id)
        VALUES (
          NEW.user_id,
          'trip_invite',
          'Trip Invitation',
          from_user_name || ' invited you to "' || COALESCE(trip_name, 'a trip') || '"',
          trip_owner_id,
          NEW.trip_id
        );
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;

  ELSIF TG_OP = 'UPDATE' AND OLD.status IN ('invited', 'pending') AND NEW.status IN ('confirmed', 'declined') THEN
    BEGIN
      SELECT COALESCE(full_name, username, 'Someone') INTO from_user_name
      FROM public.profiles WHERE id = NEW.user_id;

      INSERT INTO public.notifications (user_id, type, title, message, from_user_id, trip_id)
      VALUES (
        trip_owner_id,
        CASE WHEN NEW.status = 'confirmed' THEN 'trip_accepted'::notification_type
             ELSE 'trip_declined'::notification_type END,
        CASE WHEN NEW.status = 'confirmed' THEN 'Invite Accepted'
             ELSE 'Invite Declined' END,
        from_user_name || CASE WHEN NEW.status = 'confirmed' THEN ' accepted'
                               ELSE ' declined' END || ' your invite to "' || COALESCE(trip_name, 'a trip') || '"',
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
