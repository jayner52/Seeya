-- Add 'pending' to participation_status enum
ALTER TYPE public.participation_status ADD VALUE IF NOT EXISTS 'pending';

-- Add 'join_request' to notification_type enum
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'join_request';