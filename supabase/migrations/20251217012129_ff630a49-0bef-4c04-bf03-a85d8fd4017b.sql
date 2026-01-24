-- Add new notification type
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'tripbit_participant_added';

-- Add notification preference columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notify_tripbit_participant boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_trip_messages boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_trip_invites boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_friend_requests boolean DEFAULT true;

-- Create trigger function for tripbit participant notifications
CREATE OR REPLACE FUNCTION public.handle_tripbit_participant_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tripbit_title TEXT;
  trip_name TEXT;
  trip_id_val UUID;
  adder_name TEXT;
  adder_id UUID;
  should_notify BOOLEAN;
BEGIN
  -- Get tripbit and trip info
  SELECT tr.title, tr.trip_id, tr.user_id, t.name 
  INTO tripbit_title, trip_id_val, adder_id, trip_name
  FROM public.trip_resources tr
  JOIN public.trips t ON t.id = tr.trip_id
  WHERE tr.id = NEW.resource_id;

  -- Don't notify if user added themselves
  IF NEW.user_id = adder_id THEN
    RETURN NEW;
  END IF;

  -- Check user's notification preferences
  SELECT COALESCE(notify_tripbit_participant, true) INTO should_notify
  FROM public.profiles WHERE id = NEW.user_id;

  IF NOT should_notify THEN
    RETURN NEW;
  END IF;

  -- Get adder's name
  SELECT COALESCE(full_name, username) INTO adder_name
  FROM public.profiles WHERE id = adder_id;

  -- Create notification
  INSERT INTO public.notifications (user_id, type, title, message, from_user_id, trip_id)
  VALUES (
    NEW.user_id,
    'tripbit_participant_added',
    'Added to Tripbit',
    adder_name || ' added you to "' || tripbit_title || '" in "' || trip_name || '"',
    adder_id,
    trip_id_val
  );

  RETURN NEW;
END;
$$;

-- Create trigger on resource_participants
DROP TRIGGER IF EXISTS on_tripbit_participant_added ON public.resource_participants;
CREATE TRIGGER on_tripbit_participant_added
  AFTER INSERT ON public.resource_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_tripbit_participant_notification();