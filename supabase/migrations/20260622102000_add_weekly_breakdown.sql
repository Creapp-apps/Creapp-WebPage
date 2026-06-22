-- Add weekly_breakdown column to proposals table
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS weekly_breakdown JSONB DEFAULT NULL;
