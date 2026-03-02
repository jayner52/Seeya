-- Fix create_notification: add null guard and exception handler.
-- All notification triggers route through this function. Previously a null
-- message (e.g. user profile has no name) caused a NOT NULL constraint
-- violation that bubbled up and crashed callers (e.g. invite accept 500).
-- Must DROP first because the original function had a non-void return type.
DROP FUNCTION IF EXISTS public.create_notification(uuid, notification_type, text, text, jsonb);

CREATE FUNCTION public.create_notification(
  p_user_id uuid,
  p_type notification_type,
  p_title text,
  p_message text,
  p_data jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_message IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data);
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;
