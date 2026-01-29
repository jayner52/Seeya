-- Create the storage bucket for trip files
INSERT INTO storage.buckets (id, name, public)
VALUES ('trip-files', 'trip-files', false);

-- RLS policy: Trip participants can upload files
CREATE POLICY "Trip participants can upload files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'trip-files' AND
  EXISTS (
    SELECT 1 FROM trips 
    WHERE id::text = (storage.foldername(name))[1]
    AND (owner_id = auth.uid() OR id IN (
      SELECT trip_id FROM trip_participants 
      WHERE user_id = auth.uid() AND status IN ('invited', 'confirmed')
    ))
  )
);

-- RLS policy: Trip participants can view files
CREATE POLICY "Trip participants can view files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'trip-files' AND
  EXISTS (
    SELECT 1 FROM trips 
    WHERE id::text = (storage.foldername(name))[1]
    AND (owner_id = auth.uid() OR id IN (
      SELECT trip_id FROM trip_participants 
      WHERE user_id = auth.uid() AND status IN ('invited', 'confirmed')
    ))
  )
);

-- RLS policy: Trip participants can delete their own files
CREATE POLICY "Trip participants can delete files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'trip-files' AND
  EXISTS (
    SELECT 1 FROM trips 
    WHERE id::text = (storage.foldername(name))[1]
    AND (owner_id = auth.uid() OR id IN (
      SELECT trip_id FROM trip_participants 
      WHERE user_id = auth.uid() AND status IN ('invited', 'confirmed')
    ))
  )
);