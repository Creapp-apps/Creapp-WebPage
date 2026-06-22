-- Add description, control_milestone, and price columns to proposal_milestones table
ALTER TABLE proposal_milestones ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
ALTER TABLE proposal_milestones ADD COLUMN IF NOT EXISTS control_milestone TEXT NOT NULL DEFAULT '';
ALTER TABLE proposal_milestones ADD COLUMN IF NOT EXISTS price TEXT NOT NULL DEFAULT '';
