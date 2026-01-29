-- Fix the SELECT policy (wrong argument order)
DROP POLICY IF EXISTS "Trip participants can view messages" ON trip_messages;
CREATE POLICY "Trip participants can view messages" ON trip_messages
  FOR SELECT USING (is_trip_owner(auth.uid(), trip_id) OR is_trip_participant(auth.uid(), trip_id));

-- Fix the INSERT policy (wrong argument order)
DROP POLICY IF EXISTS "Trip participants can send messages" ON trip_messages;
CREATE POLICY "Trip participants can send messages" ON trip_messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    AND (is_trip_owner(auth.uid(), trip_id) OR is_trip_participant(auth.uid(), trip_id))
  );

-- Add trip_message to notification_type enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'trip_message';

-- Create trigger function for chat notifications
CREATE OR REPLACE FUNCTION public.handle_trip_message_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  SELECT owner_id, 'trip_message', 'New Message', 
         sender_name || ' sent a message in "' || trip_name || '"',
         NEW.user_id, NEW.trip_id
  FROM public.trips 
  WHERE id = NEW.trip_id AND owner_id != NEW.user_id;
  
  -- Notify all confirmed participants (except the sender)
  INSERT INTO public.notifications (user_id, type, title, message, from_user_id, trip_id)
  SELECT user_id, 'trip_message', 'New Message',
         sender_name || ' sent a message in "' || trip_name || '"',
         NEW.user_id, NEW.trip_id
  FROM public.trip_participants
  WHERE trip_id = NEW.trip_id 
    AND status = 'confirmed' 
    AND user_id != NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_trip_message_created ON public.trip_messages;
CREATE TRIGGER on_trip_message_created
  AFTER INSERT ON public.trip_messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_trip_message_notification();