-- Migration 004: Add videos and watch_history tables for full user metrics
-- Purpose: Enable complete engagement tracking and business intelligence
-- Date: 2025-11-18

-- Add admins table (if not exists) - required for videos foreign key
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'editor' CHECK(role IN ('super_admin', 'admin', 'editor', 'moderator')),
  is_active BOOLEAN DEFAULT 1,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add videos table - BAM content library
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  title_km TEXT,
  description TEXT,
  description_km TEXT,
  thumbnail_url TEXT,
  preview_url TEXT,
  video_url TEXT,
  r2_key TEXT,
  category TEXT NOT NULL,
  subcategory TEXT,
  section TEXT,
  duration INTEGER,  -- in seconds (REQUIRED for watch time calculations)
  file_size INTEGER,
  resolution TEXT,
  aspect_ratio TEXT DEFAULT '16:9',
  orientation TEXT DEFAULT 'landscape',
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  featured BOOLEAN DEFAULT 0,
  featured_order INTEGER,
  badge TEXT,
  tags TEXT,
  language TEXT DEFAULT 'km',
  subtitles TEXT,
  age_rating TEXT DEFAULT 'all',
  uploaded_by TEXT NOT NULL,
  published_at DATETIME,
  scheduled_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES admins(id)
);

-- Add watch_history table - user viewing behavior tracking
-- Column names MUST match query expectations in admin.ts
CREATE TABLE IF NOT EXISTS watch_history (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  watch_position INTEGER DEFAULT 0,  -- seconds watched
  total_duration INTEGER,  -- total video duration in seconds
  completion_percentage DECIMAL(5,2),  -- percentage (0-100)
  last_watched DATETIME DEFAULT CURRENT_TIMESTAMP,  -- DATETIME type for JULIANDAY() function
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
  UNIQUE(profile_id, video_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_uploaded_by ON videos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_videos_featured ON videos(featured);
CREATE INDEX IF NOT EXISTS idx_videos_section ON videos(section);

CREATE INDEX IF NOT EXISTS idx_watch_history_user ON watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_profile ON watch_history(profile_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_video ON watch_history(video_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_last_watched ON watch_history(last_watched DESC);
CREATE INDEX IF NOT EXISTS idx_watch_history_profile_video ON watch_history(profile_id, video_id);

-- Verification queries (comment out before running)
-- SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
-- PRAGMA table_info(videos);
-- PRAGMA table_info(watch_history);
