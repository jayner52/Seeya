-- Drop the vulnerable policy that allows any authenticated user to update any subscription
DROP POLICY IF EXISTS "Service role can update subscriptions" ON user_subscriptions;