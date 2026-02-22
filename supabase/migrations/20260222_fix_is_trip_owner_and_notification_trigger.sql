-- Fix is_trip_owner function and notification trigger
-- Applied manually to live DB on 2026-02-22 via Supabase SQL Editor.
--
-- Background:
-- The live DB had is_trip_owner(trip_uuid uuid, user_uuid uuid) with a body that
-- evaluated to: WHERE id = auth.uid() AND user_id = trip_id — always false.
-- This caused all INSERT/UPDATE/DELETE on trip_locations to be rejected by RLS.
-- The notification trigger was also using owner_id (non-existent column) on trips.
--
-- Fix 1: is_trip_owner — swap body to match call order
-- RLS policies call: is_trip_owner(auth.uid(), trip_id)
-- So trip_uuid=auth.uid(), user_uuid=trip_id → body must be id=user_uuid AND user_id=trip_uuid
CREATE OR REPLACE FUNCTION public.is_trip_owner(trip_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
    SELECT EXISTS (
      SELECT 1 FROM trips
      WHERE id = user_uuid AND user_id = trip_uuid
    );
$function$;

-- Fix 2: notification trigger — use user_id instead of owner_id
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
      SELECT COALESCE(full_name, username) INTO from_user_name
      FROM public.profiles WHERE id = trip_owner_id;
      INSERT INTO public.notifications (user_id, type, title, message, from_user_id, trip_id)
      VALUES (
        NEW.user_id, 'trip_invite', 'Trip Invitation',
        from_user_name || ' invited you to "' || trip_name || '"',
        trip_owner_id, NEW.trip_id
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
      NEW.user_id, NEW.trip_id
    );
  END IF;
  RETURN NEW;
END;
$$;
