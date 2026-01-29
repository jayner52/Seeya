-- Fix Security Issue 1: Remove overly permissive notifications INSERT policy
-- SECURITY DEFINER triggers already bypass RLS, so this policy is not needed for triggers
-- and it allows any authenticated user to create notifications for any user (spam/phishing risk)
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Fix Security Issue 2: Remove dangerous subscriptions UPDATE policy
-- The "Service role can update subscriptions" policy allows ANY authenticated user to modify
-- ANY subscription record - enabling plan_type upgrades without payment
-- Service role bypasses RLS anyway, so this policy is not needed for webhooks
DROP POLICY IF EXISTS "Service role can update subscriptions" ON public.user_subscriptions;