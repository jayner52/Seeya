-- Allow users to view profiles of people who sent them pending friend requests
CREATE POLICY "Users can view pending friend request senders"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.friendships
    WHERE friendships.requester_id = profiles.id
    AND friendships.addressee_id = auth.uid()
    AND friendships.status = 'pending'
  )
);