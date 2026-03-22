-- Fix handle_trip_participant_notification trigger to use user_id instead of owner_id.
-- The trips table uses user_id as the owner field. This trigger was querying owner_id,
-- which caused it to hang/error when the participant INSERT went through (after fixing
-- is_trip_owner). Also adds a guard so the owner adding themselves doesn't generate
-- a self-invite notification.
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
  -- Get trip info (using user_id, not owner_id)
  SELECT name, user_id INTO trip_name, trip_owner_id
  FROM public.trips WHERE id = NEW.trip_id;

  IF TG_OP = 'INSERT' THEN
    -- Only notify if someone else is being invited (not owner adding themselves)
    IF NEW.user_id != trip_owner_id THEN
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
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'invited' AND NEW.status IN ('confirmed', 'declined') THEN
    SELECT COALESCE(full_name, username) INTO from_user_name
    FROM public.profiles WHERE id = NEW.user_id;

    INSERT INTO public.notifications (user_id, type, title, message, from_user_id, trip_id)
    VALUES (
      trip_owner_id,
      CASE WHEN NEW.status = 'confirmed' THEN 'trip_accepted'::notification_type ELSE 'trip_declined'::notification_type END,
      CASE WHEN NEW.status = 'confirmed' THEN 'Invite Accepted' ELSE 'Invite Declined' END,
      from_user_name || CASE WHEN NEW.status = 'confirmed' THEN ' accepted' ELSE ' declined' END || ' your invite to "' || trip_name || '"',
      NEW.user_id,
      NEW.trip_id
    );
  END IF;

  RETURN NEW;
END;
$$;
