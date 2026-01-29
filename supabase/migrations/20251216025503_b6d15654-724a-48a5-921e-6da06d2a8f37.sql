-- Create function to handle join request notifications
CREATE OR REPLACE FUNCTION public.handle_join_request_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  trip_name TEXT;
  trip_owner_id UUID;
  requester_name TEXT;
BEGIN
  -- Only handle pending status (join requests)
  IF NEW.status = 'pending' THEN
    -- Get trip info
    SELECT name, owner_id INTO trip_name, trip_owner_id
    FROM public.trips WHERE id = NEW.trip_id;
    
    -- Get requester name
    SELECT COALESCE(full_name, username) INTO requester_name
    FROM public.profiles WHERE id = NEW.user_id;
    
    -- Notify trip owner about join request
    INSERT INTO public.notifications (user_id, type, title, message, from_user_id, trip_id)
    VALUES (
      trip_owner_id,
      'join_request',
      'Join Request',
      requester_name || ' requested to join "' || trip_name || '"',
      NEW.user_id,
      NEW.trip_id
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for join request notifications
DROP TRIGGER IF EXISTS on_join_request ON public.trip_participants;
CREATE TRIGGER on_join_request
  AFTER INSERT ON public.trip_participants
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.handle_join_request_notification();

-- Add RLS policy for users to create pending join requests
CREATE POLICY "Users can request to join trips"
ON public.trip_participants
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND status = 'pending'
);