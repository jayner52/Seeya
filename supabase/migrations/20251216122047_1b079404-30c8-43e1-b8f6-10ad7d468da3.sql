-- Create table to track when users last read trip chats
CREATE TABLE public.trip_chat_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, trip_id)
);

-- Enable RLS
ALTER TABLE public.trip_chat_reads ENABLE ROW LEVEL SECURITY;

-- Users can manage their own read status
CREATE POLICY "Users can manage their own chat read status"
ON public.trip_chat_reads
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);