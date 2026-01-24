-- Restore notifications INSERT policy for SECURITY DEFINER triggers
-- This is required because notification triggers need to insert records
-- The triggers validate context before inserting (e.g., friendship exists, user is trip participant)
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);