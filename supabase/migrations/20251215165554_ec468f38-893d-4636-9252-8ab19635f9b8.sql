-- Create trip messages table
CREATE TABLE public.trip_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trip_messages ENABLE ROW LEVEL SECURITY;

-- Policies: Only trip owner and confirmed participants can view messages
CREATE POLICY "Trip participants can view messages"
  ON public.trip_messages FOR SELECT
  USING (
    public.is_trip_owner(trip_id, auth.uid()) OR 
    public.is_trip_participant(trip_id, auth.uid())
  );

-- Policies: Only trip owner and confirmed participants can send messages
CREATE POLICY "Trip participants can send messages"
  ON public.trip_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND 
    (public.is_trip_owner(trip_id, auth.uid()) OR public.is_trip_participant(trip_id, auth.uid()))
  );

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages"
  ON public.trip_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_trip_messages_trip_id ON public.trip_messages(trip_id);
CREATE INDEX idx_trip_messages_created_at ON public.trip_messages(created_at);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_messages;