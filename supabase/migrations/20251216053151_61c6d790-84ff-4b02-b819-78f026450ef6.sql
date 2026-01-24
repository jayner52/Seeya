-- Add 'tentative' to participation_status enum
ALTER TYPE participation_status ADD VALUE IF NOT EXISTS 'tentative';