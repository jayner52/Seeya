-- Update notification type enum to use trip_tripbit instead of trip_resource
-- First add the new value
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'trip_tripbit';

-- Update the notification trigger function to use trip_tripbit
CREATE OR REPLACE FUNCTION public.handle_trip_resource_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  trip_name TEXT;
  sender_name TEXT;
BEGIN
  -- Get trip name
  SELECT name INTO trip_name FROM public.trips WHERE id = NEW.trip_id;
  
  -- Get sender name
  SELECT COALESCE(full_name, username) INTO sender_name 
  FROM public.profiles WHERE id = NEW.user_id;
  
  -- Notify the trip owner (if not the sender)
  INSERT INTO public.notifications (user_id, type, title, message, from_user_id, trip_id)
  SELECT owner_id, 'trip_tripbit', 'New Tripbit', 
         sender_name || ' added a tripbit to "' || trip_name || '"',
         NEW.user_id, NEW.trip_id
  FROM public.trips 
  WHERE id = NEW.trip_id AND owner_id != NEW.user_id;
  
  -- Notify all confirmed participants (except the sender)
  INSERT INTO public.notifications (user_id, type, title, message, from_user_id, trip_id)
  SELECT user_id, 'trip_tripbit', 'New Tripbit',
         sender_name || ' added a tripbit to "' || trip_name || '"',
         NEW.user_id, NEW.trip_id
  FROM public.trip_participants
  WHERE trip_id = NEW.trip_id 
    AND status = 'confirmed' 
    AND user_id != NEW.user_id;
  
  RETURN NEW;
END;
$function$;