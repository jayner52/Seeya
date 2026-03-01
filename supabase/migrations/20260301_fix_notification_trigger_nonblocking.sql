-- Make the trip_participant notification trigger non-blocking.
-- Previously, if the notification INSERT failed (e.g. the new user's profile
-- didn't exist yet for fresh email signups), it rolled back the entire
-- trip_participants INSERT, causing a 500 on invite accept.
-- Fix: wrap notification inserts in BEGIN...EXCEPTION so any failure is
-- silently skipped rather than aborting the participant row.

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
        SELECT COALESCE(full_name, username) INTO from_user_name
        FROM public.profiles WHERE id = trip_owner_id;

        INSERT INTO public.notifications (user_id, type, title, message, from_user_id, trip_id)
        VALUES (
          NEW.user_id,
          'trip_invite',
          'Trip Invitation',
          from_user_name || ' invited you to "' || trip_name || '"',
          trip_owner_id,
          NEW.trip_id
        );
      EXCEPTION WHEN OTHERS THEN
        -- Notification failure must not block participant creation
        NULL;
      END;
    END IF;

  ELSIF TG_OP = 'UPDATE' AND OLD.status IN ('invited', 'pending') AND NEW.status IN ('confirmed', 'declined') THEN
    BEGIN
      SELECT COALESCE(full_name, username) INTO from_user_name
      FROM public.profiles WHERE id = NEW.user_id;

      INSERT INTO public.notifications (user_id, type, title, message, from_user_id, trip_id)
      VALUES (
        trip_owner_id,
        CASE WHEN NEW.status = 'confirmed' THEN 'trip_accepted'::notification_type
             ELSE 'trip_declined'::notification_type END,
        CASE WHEN NEW.status = 'confirmed' THEN 'Invite Accepted'
             ELSE 'Invite Declined' END,
        from_user_name || CASE WHEN NEW.status = 'confirmed' THEN ' accepted'
                               ELSE ' declined' END || ' your invite to "' || trip_name || '"',
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
