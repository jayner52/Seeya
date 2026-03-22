-- Migration: Fix notification preference disconnect + add "maybe" notification type
-- Problem: Triggers read from profiles.notify_* but apps write to user_settings.notify_*
-- Solution: Update all triggers to read preferences from user_settings table

-- 1. Add trip_maybe to notification_type enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'trip_maybe';

-- 2. Update handle_friendship_notification() to check user_settings preferences
CREATE OR REPLACE FUNCTION public.handle_friendship_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  from_user_name TEXT;
  should_notify BOOLEAN;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    BEGIN
      -- Check recipient's notification preference
      SELECT COALESCE(us.notify_travel_pal_requests, true) INTO should_notify
      FROM user_settings us WHERE us.user_id = NEW.addressee_id;

      IF NOT COALESCE(should_notify, true) THEN
        RETURN NEW;
      END IF;

      SELECT COALESCE(full_name, username, 'Someone') INTO from_user_name
      FROM public.profiles WHERE id = NEW.requester_id;

      INSERT INTO public.notifications (user_id, type, title, message, from_user_id, friendship_id)
      VALUES (
        NEW.addressee_id,
        'friend_request',
        'Friend Request',
        from_user_name || ' sent you a friend request',
        NEW.requester_id,
        NEW.id
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    BEGIN
      -- Check requester's notification preference
      SELECT COALESCE(us.notify_travel_pal_requests, true) INTO should_notify
      FROM user_settings us WHERE us.user_id = NEW.requester_id;

      IF NOT COALESCE(should_notify, true) THEN
        RETURN NEW;
      END IF;

      SELECT COALESCE(full_name, username, 'Someone') INTO from_user_name
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
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Update handle_trip_participant_notification() to check user_settings + handle 'maybe'
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
  should_notify BOOLEAN;
BEGIN
  SELECT name, user_id INTO trip_name, trip_owner_id
  FROM public.trips WHERE id = NEW.trip_id;

  IF TG_OP = 'INSERT' THEN
    IF NEW.user_id != trip_owner_id THEN
      BEGIN
        -- Check invitee's notification preference
        SELECT COALESCE(us.notify_trip_invitations, true) INTO should_notify
        FROM user_settings us WHERE us.user_id = NEW.user_id;

        IF NOT COALESCE(should_notify, true) THEN
          RETURN NEW;
        END IF;

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

  ELSIF TG_OP = 'UPDATE' AND OLD.status IN ('invited', 'pending') AND NEW.status IN ('confirmed', 'declined', 'maybe') THEN
    BEGIN
      -- Check trip owner's notification preference
      SELECT COALESCE(us.notify_trip_invitations, true) INTO should_notify
      FROM user_settings us WHERE us.user_id = trip_owner_id;

      IF NOT COALESCE(should_notify, true) THEN
        RETURN NEW;
      END IF;

      SELECT COALESCE(full_name, username, 'Someone') INTO from_user_name
      FROM public.profiles WHERE id = NEW.user_id;

      INSERT INTO public.notifications (user_id, type, title, message, from_user_id, trip_id)
      VALUES (
        trip_owner_id,
        CASE
          WHEN NEW.status = 'confirmed' THEN 'trip_accepted'::notification_type
          WHEN NEW.status = 'declined' THEN 'trip_declined'::notification_type
          WHEN NEW.status = 'maybe' THEN 'trip_maybe'::notification_type
        END,
        CASE
          WHEN NEW.status = 'confirmed' THEN 'Invite Accepted'
          WHEN NEW.status = 'declined' THEN 'Invite Declined'
          WHEN NEW.status = 'maybe' THEN 'Response: Maybe'
        END,
        from_user_name || CASE
          WHEN NEW.status = 'confirmed' THEN ' accepted'
          WHEN NEW.status = 'declined' THEN ' declined'
          WHEN NEW.status = 'maybe' THEN ' responded maybe to'
        END || ' your invite to "' || COALESCE(trip_name, 'a trip') || '"',
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

-- 4. Update handle_trip_message_notification() to check user_settings per recipient
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
  BEGIN
    SELECT name INTO trip_name FROM public.trips WHERE id = NEW.trip_id;

    SELECT COALESCE(full_name, username, 'Someone') INTO sender_name
    FROM public.profiles WHERE id = NEW.user_id;

    -- Notify the trip owner (if not the sender and preference allows)
    INSERT INTO public.notifications (user_id, type, title, message, from_user_id, trip_id)
    SELECT t.user_id, 'trip_message', 'New Message',
           sender_name || ' sent a message in "' || COALESCE(trip_name, 'a trip') || '"',
           NEW.user_id, NEW.trip_id
    FROM public.trips t
    LEFT JOIN public.user_settings us ON us.user_id = t.user_id
    WHERE t.id = NEW.trip_id
      AND t.user_id != NEW.user_id
      AND COALESCE(us.notify_trip_messages, true) = true;

    -- Notify all confirmed/maybe participants (except sender, respecting preferences)
    INSERT INTO public.notifications (user_id, type, title, message, from_user_id, trip_id)
    SELECT tp.user_id, 'trip_message', 'New Message',
           sender_name || ' sent a message in "' || COALESCE(trip_name, 'a trip') || '"',
           NEW.user_id, NEW.trip_id
    FROM public.trip_participants tp
    LEFT JOIN public.user_settings us ON us.user_id = tp.user_id
    WHERE tp.trip_id = NEW.trip_id
      AND tp.status IN ('confirmed', 'maybe')
      AND tp.user_id != NEW.user_id
      AND COALESCE(us.notify_trip_messages, true) = true;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

-- 5. Update handle_trip_resource_notification() to check user_settings per recipient
CREATE OR REPLACE FUNCTION public.handle_trip_resource_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  trip_name TEXT;
  sender_name TEXT;
BEGIN
  BEGIN
    SELECT name INTO trip_name FROM public.trips WHERE id = NEW.trip_id;

    SELECT COALESCE(full_name, username, 'Someone') INTO sender_name
    FROM public.profiles WHERE id = NEW.user_id;

    -- Notify trip owner (if not sender, respecting preferences)
    INSERT INTO public.notifications (user_id, type, title, message, from_user_id, trip_id)
    SELECT t.user_id, 'trip_tripbit', 'New TripBit',
           sender_name || ' added a tripbit to "' || COALESCE(trip_name, 'a trip') || '"',
           NEW.user_id, NEW.trip_id
    FROM public.trips t
    LEFT JOIN public.user_settings us ON us.user_id = t.user_id
    WHERE t.id = NEW.trip_id
      AND t.user_id != NEW.user_id
      AND COALESCE(us.notify_trip_messages, true) = true;

    -- Notify confirmed/maybe participants (except sender, respecting preferences)
    INSERT INTO public.notifications (user_id, type, title, message, from_user_id, trip_id)
    SELECT tp.user_id, 'trip_tripbit', 'New TripBit',
           sender_name || ' added a tripbit to "' || COALESCE(trip_name, 'a trip') || '"',
           NEW.user_id, NEW.trip_id
    FROM public.trip_participants tp
    LEFT JOIN public.user_settings us ON us.user_id = tp.user_id
    WHERE tp.trip_id = NEW.trip_id
      AND tp.status IN ('confirmed', 'maybe')
      AND tp.user_id != NEW.user_id
      AND COALESCE(us.notify_trip_messages, true) = true;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

-- 6. Update handle_trip_recommendation_notification() to check user_settings per recipient
CREATE OR REPLACE FUNCTION public.handle_trip_recommendation_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  trip_name TEXT;
  sender_name TEXT;
BEGIN
  BEGIN
    SELECT name INTO trip_name FROM public.trips WHERE id = NEW.trip_id;

    SELECT COALESCE(full_name, username, 'Someone') INTO sender_name
    FROM public.profiles WHERE id = NEW.user_id;

    -- Notify trip owner (respecting preferences)
    INSERT INTO public.notifications (user_id, type, title, message, from_user_id, trip_id)
    SELECT t.user_id, 'trip_recommendation', 'New Recommendation',
           sender_name || ' added a recommendation to "' || COALESCE(trip_name, 'a trip') || '"',
           NEW.user_id, NEW.trip_id
    FROM public.trips t
    LEFT JOIN public.user_settings us ON us.user_id = t.user_id
    WHERE t.id = NEW.trip_id
      AND t.user_id != NEW.user_id
      AND COALESCE(us.notify_trip_messages, true) = true;

    -- Notify confirmed/maybe participants (respecting preferences)
    INSERT INTO public.notifications (user_id, type, title, message, from_user_id, trip_id)
    SELECT tp.user_id, 'trip_recommendation', 'New Recommendation',
           sender_name || ' added a recommendation to "' || COALESCE(trip_name, 'a trip') || '"',
           NEW.user_id, NEW.trip_id
    FROM public.trip_participants tp
    LEFT JOIN public.user_settings us ON us.user_id = tp.user_id
    WHERE tp.trip_id = NEW.trip_id
      AND tp.status IN ('confirmed', 'maybe')
      AND tp.user_id != NEW.user_id
      AND COALESCE(us.notify_trip_messages, true) = true;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

-- 7. Update handle_join_request_notification() to check user_settings for trip owner
CREATE OR REPLACE FUNCTION public.handle_join_request_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  trip_name TEXT;
  trip_owner_id UUID;
  requester_name TEXT;
  should_notify BOOLEAN;
BEGIN
  IF NEW.status = 'pending' THEN
    BEGIN
      SELECT name, user_id INTO trip_name, trip_owner_id
      FROM public.trips WHERE id = NEW.trip_id;

      -- Check trip owner's notification preference
      SELECT COALESCE(us.notify_trip_invitations, true) INTO should_notify
      FROM user_settings us WHERE us.user_id = trip_owner_id;

      IF NOT COALESCE(should_notify, true) THEN
        RETURN NEW;
      END IF;

      SELECT COALESCE(full_name, username, 'Someone') INTO requester_name
      FROM public.profiles WHERE id = NEW.user_id;

      INSERT INTO public.notifications (user_id, type, title, message, from_user_id, trip_id)
      VALUES (
        trip_owner_id,
        'join_request',
        'Join Request',
        requester_name || ' requested to join "' || COALESCE(trip_name, 'a trip') || '"',
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

-- 8. Update handle_tripbit_participant_notification() to read from user_settings
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

    -- Check user's notification preference from user_settings (not profiles)
    SELECT COALESCE(us.notify_added_to_tripbit, true) INTO should_notify
    FROM public.user_settings us WHERE us.user_id = NEW.user_id;

    IF NOT COALESCE(should_notify, true) THEN
      RETURN NEW;
    END IF;

    -- Get adder's name
    SELECT COALESCE(full_name, username, 'Someone') INTO adder_name
    FROM public.profiles WHERE id = adder_id;

    -- Create notification
    INSERT INTO public.notifications (user_id, type, title, message, from_user_id, trip_id)
    VALUES (
      NEW.user_id,
      'tripbit_participant_added',
      'Added to TripBit',
      adder_name || ' added you to "' || COALESCE(tripbit_title, 'a tripbit') || '" in "' || COALESCE(trip_name, 'a trip') || '"',
      adder_id,
      trip_id_val
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;
