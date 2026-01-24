-- Fix 1: Remove public access to trip invite tokens
-- Tokens should only be validated through accept_trip_invite() RPC
DROP POLICY IF EXISTS "Anyone can view valid invite tokens" ON public.trip_invites;

-- Fix 2: Remove unrestricted notification inserts
-- Notifications are created by SECURITY DEFINER triggers which bypass RLS
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;