-- Add new notification types to the enum
ALTER TYPE notification_type ADD VALUE 'trip_resource';
ALTER TYPE notification_type ADD VALUE 'trip_recommendation';

-- Create function to handle trip resource notifications
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
  SELECT owner_id, 'trip_resource', 'New Resource', 
         sender_name || ' added a resource to "' || trip_name || '"',
         NEW.user_id, NEW.trip_id
  FROM public.trips 
  WHERE id = NEW.trip_id AND owner_id != NEW.user_id;
  
  -- Notify all confirmed participants (except the sender)
  INSERT INTO public.notifications (user_id, type, title, message, from_user_id, trip_id)
  SELECT user_id, 'trip_resource', 'New Resource',
         sender_name || ' added a resource to "' || trip_name || '"',
         NEW.user_id, NEW.trip_id
  FROM public.trip_participants
  WHERE trip_id = NEW.trip_id 
    AND status = 'confirmed' 
    AND user_id != NEW.user_id;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for resource notifications
CREATE TRIGGER on_trip_resource_created
  AFTER INSERT ON public.trip_resources
  FOR EACH ROW EXECUTE FUNCTION public.handle_trip_resource_notification();

-- Create function to handle trip recommendation notifications
CREATE OR REPLACE FUNCTION public.handle_trip_recommendation_notification()
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
  SELECT owner_id, 'trip_recommendation', 'New Recommendation', 
         sender_name || ' added a recommendation to "' || trip_name || '"',
         NEW.user_id, NEW.trip_id
  FROM public.trips 
  WHERE id = NEW.trip_id AND owner_id != NEW.user_id;
  
  -- Notify all confirmed participants (except the sender)
  INSERT INTO public.notifications (user_id, type, title, message, from_user_id, trip_id)
  SELECT user_id, 'trip_recommendation', 'New Recommendation',
         sender_name || ' added a recommendation to "' || trip_name || '"',
         NEW.user_id, NEW.trip_id
  FROM public.trip_participants
  WHERE trip_id = NEW.trip_id 
    AND status = 'confirmed' 
    AND user_id != NEW.user_id;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for recommendation notifications
CREATE TRIGGER on_trip_recommendation_created
  AFTER INSERT ON public.trip_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.handle_trip_recommendation_notification();