-- Migration: Add video orientation and aspect ratio fields
-- Date: 2025-09-14

-- Add aspect_ratio column if it doesn't exist
ALTER TABLE videos ADD COLUMN IF NOT EXISTS aspect_ratio TEXT DEFAULT '16:9';

-- Add orientation column if it doesn't exist
ALTER TABLE videos ADD COLUMN IF NOT EXISTS orientation TEXT DEFAULT 'landscape' CHECK(orientation IN ('landscape', 'portrait', 'square'));

-- Update existing videos to have default values
UPDATE videos
SET aspect_ratio = '16:9',
    orientation = 'landscape'
WHERE aspect_ratio IS NULL OR orientation IS NULL;