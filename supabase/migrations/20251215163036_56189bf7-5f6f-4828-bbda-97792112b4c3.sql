-- Create notification type enum
CREATE TYPE notification_type AS ENUM (
  'friend_request',
  'friend_accepted',
  'trip_invite',
  'trip_accepted',
  'trip_declined',
  'friend_trip'
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  friendship_id UUID REFERENCES public.friendships(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- System can insert notifications (via triggers with security definer)
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Trigger function for friend request notifications
CREATE OR REPLACE FUNCTION public.handle_friendship_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  from_user_name TEXT;
BEGIN
  -- Get the name of the user who initiated the action
  SELECT COALESCE(full_name, username) INTO from_user_name
  FROM public.profiles WHERE id = NEW.requester_id;

  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    -- New friend request - notify addressee
    INSERT INTO public.notifications (user_id, type, title, message, from_user_id, friendship_id)
    VALUES (
      NEW.addressee_id,
      'friend_request',
      'Friend Request',
      from_user_name || ' sent you a friend request',
      NEW.requester_id,
      NEW.id
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- Friend request accepted - notify requester
    SELECT COALESCE(full_name, username) INTO from_user_name
    FROM public.profiles WHERE id = NEW.addressee_id;
    
    INSERT INTO public.notifications (user_id, type, title, message, from_user_id, friendship_id)
    VALUES (
      NEW.requester_id,
      'friend_accepted',
      'Friend Added',
      from_user_name || ' accepted your friend request',
      NEW.addressee_id,
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for friendships
CREATE TRIGGER on_friendship_change
  AFTER INSERT OR UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_friendship_notification();

-- Trigger function for trip participant notifications
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
  -- Get trip info
  SELECT name, owner_id INTO trip_name, trip_owner_id
  FROM public.trips WHERE id = NEW.trip_id;

  IF TG_OP = 'INSERT' THEN
    -- New trip invite - notify the invited user
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
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'invited' AND NEW.status IN ('confirmed', 'declined') THEN
    -- Invite response - notify trip owner
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

-- Trigger for trip participants
CREATE TRIGGER on_trip_participant_change
  AFTER INSERT OR UPDATE ON public.trip_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_trip_participant_notification();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;