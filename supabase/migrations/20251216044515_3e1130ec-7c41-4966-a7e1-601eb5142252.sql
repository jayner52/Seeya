-- Add personal_visibility column to trip_participants
-- NULL means follow the trip owner's visibility setting
-- Any other value allows participants to set their own (more restrictive) visibility
ALTER TABLE trip_participants 
ADD COLUMN personal_visibility visibility_level DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN trip_participants.personal_visibility IS 'Participant-level visibility override. NULL = follow trip setting. Most restrictive between trip and participant visibility wins.';