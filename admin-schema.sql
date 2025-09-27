-- Admin Tables for BAM Video Management System

-- Admin users (employees)
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

-- Videos table for BAM content
CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  title_km TEXT, -- Khmer title
  description TEXT,
  description_km TEXT, -- Khmer description
  thumbnail_url TEXT,
  preview_url TEXT,
  video_url TEXT,
  r2_key TEXT, -- Cloudflare R2 object key
  category TEXT NOT NULL CHECK(category IN (
    'politics', 'world', 'music', 'cars_motos', 'sports',
    'travel', 'made_in_cambodia', 'latest', 'events', 'comedy',
    'originals', 'community', 'education'
  )),
  subcategory TEXT,
  section TEXT, -- For homepage sections like 'hero', 'best_hit', 'omg', etc.
  duration INTEGER, -- in seconds
  file_size INTEGER, -- in bytes
  resolution TEXT, -- '1080p', '720p', '480p'
  aspect_ratio TEXT DEFAULT '16:9', -- '16:9', '9:16', '1:1', '4:3', etc.
  orientation TEXT DEFAULT 'landscape' CHECK(orientation IN ('landscape', 'portrait', 'square')),
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'scheduled', 'archived', 'processing')),
  featured BOOLEAN DEFAULT 0,
  featured_order INTEGER, -- Order in hero carousel
  badge TEXT, -- 'BAM Original', 'Live', 'New', 'OMG!', 'Community Pick', etc.
  tags TEXT, -- JSON array as text
  language TEXT DEFAULT 'km', -- 'km' for Khmer, 'en' for English
  subtitles TEXT, -- JSON array of available subtitle languages
  age_rating TEXT DEFAULT 'all', -- 'all', 'teen', 'adult'
  uploaded_by TEXT NOT NULL,
  published_at DATETIME,
  scheduled_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES admins(id)
);

-- Events table for BAM events
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title TEXT NOT NULL,
  title_km TEXT,
  description TEXT,
  description_km TEXT,
  banner_url TEXT,
  thumbnail_url TEXT,
  event_date DATETIME NOT NULL,
  event_end_date DATETIME,
  location TEXT,
  event_type TEXT CHECK(event_type IN ('concert', 'festival', 'live_show', 'premiere', 'conference', 'sports')),
  ticket_url TEXT,
  stream_url TEXT,
  max_capacity INTEGER,
  current_bookings INTEGER DEFAULT 0,
  price DECIMAL(10,2),
  status TEXT DEFAULT 'upcoming' CHECK(status IN ('upcoming', 'live', 'completed', 'cancelled')),
  featured BOOLEAN DEFAULT 0,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES admins(id)
);

-- Categories management
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT UNIQUE NOT NULL,
  name_km TEXT,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT,
  nav_order INTEGER,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Video analytics table
CREATE TABLE IF NOT EXISTS video_analytics (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  video_id TEXT NOT NULL,
  date DATE NOT NULL,
  views INTEGER DEFAULT 0,
  unique_viewers INTEGER DEFAULT 0,
  watch_time INTEGER DEFAULT 0, -- total seconds watched
  avg_watch_duration INTEGER DEFAULT 0, -- average seconds per view
  completion_rate DECIMAL(5,2), -- percentage
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  region TEXT, -- viewing region/country
  device_type TEXT, -- 'mobile', 'desktop', 'tablet', 'tv'
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
  UNIQUE(video_id, date, region, device_type)
);

-- User watch history (for "Continue Watching")
CREATE TABLE IF NOT EXISTS watch_history (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  video_id TEXT NOT NULL,
  watch_position INTEGER DEFAULT 0, -- seconds watched
  total_duration INTEGER, -- total video duration
  completion_percentage DECIMAL(5,2),
  last_watched DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
  UNIQUE(profile_id, video_id)
);

-- Comments on videos
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  video_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  content TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT 0,
  is_hidden BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Admin activity logs
CREATE TABLE IF NOT EXISTS admin_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'login', 'upload', 'publish', 'delete', 'update', etc.
  entity_type TEXT, -- 'video', 'event', 'user', etc.
  entity_id TEXT,
  details TEXT, -- JSON with additional details
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admins(id)
);

-- Homepage sections configuration
CREATE TABLE IF NOT EXISTS homepage_sections (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  section_key TEXT UNIQUE NOT NULL, -- 'hero', 'you_may_like', 'best_hit', etc.
  title TEXT NOT NULL,
  title_km TEXT,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT 1,
  max_items INTEGER DEFAULT 18,
  query_type TEXT, -- 'manual', 'auto_popular', 'auto_recent', 'auto_category'
  query_params TEXT, -- JSON with query parameters
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Featured content management
CREATE TABLE IF NOT EXISTS featured_content (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  video_id TEXT NOT NULL,
  section_key TEXT NOT NULL,
  display_order INTEGER,
  start_date DATETIME,
  end_date DATETIME,
  is_active BOOLEAN DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
  FOREIGN KEY (section_key) REFERENCES homepage_sections(section_key),
  FOREIGN KEY (created_by) REFERENCES admins(id),
  UNIQUE(video_id, section_key)
);

-- Indexes for performance
CREATE INDEX idx_videos_category ON videos(category);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_featured ON videos(featured);
CREATE INDEX idx_videos_published_at ON videos(published_at);
CREATE INDEX idx_analytics_video_date ON video_analytics(video_id, date);
CREATE INDEX idx_watch_history_user ON watch_history(user_id, last_watched);
CREATE INDEX idx_admin_logs_admin ON admin_logs(admin_id, created_at);
CREATE INDEX idx_featured_content_section ON featured_content(section_key, is_active);

-- Insert default categories
INSERT OR IGNORE INTO categories (name, name_km, slug, nav_order) VALUES
  ('Home', 'ទំព័រដើម', 'home', 1),
  ('Politics', 'នយោបាយ', 'politics', 2),
  ('World', 'ពិភពលោក', 'world', 3),
  ('Music', 'តន្ត្រី', 'music', 4),
  ('Cars & Motos', 'រថយន្ត និង ម៉ូតូ', 'cars-motos', 5),
  ('Sports', 'កីឡា', 'sports', 6),
  ('Travel', 'ទេសចរណ៍', 'travel', 7),
  ('Made in Cambodia', 'ផលិតក្នុងស្រុក', 'made-in-cambodia', 8),
  ('Latest', 'ថ្មីៗ', 'latest', 9),
  ('Events', 'ព្រឹត្តិការណ៍', 'events', 10);

-- Insert default homepage sections
INSERT OR IGNORE INTO homepage_sections (section_key, title, title_km, display_order, max_items) VALUES
  ('hero', 'Hero Carousel', 'ខារ៉ូសែល', 1, 5),
  ('you_may_like', 'You May Like It!', 'អ្នកប្រហែលជាចូលចិត្ត', 2, 18),
  ('keep_watching', 'People Keep Watching It!', 'មនុស្សកំពុងមើល', 3, 18),
  ('omg', 'OMG! (Controversial)', 'អូ! ចម្លែក', 4, 18),
  ('world_watching', 'The World Is Watching Cambodia!', 'ពិភពលោកកំពុងមើលកម្ពុជា', 5, 18),
  ('best_hit', 'Best Hit!', 'ពេញនិយមបំផុត', 6, 10),
  ('comedy', 'Laughing Is Good!', 'សើចល្អ', 7, 18),
  ('originals', 'BAM Originals', 'BAM ដើម', 8, 18),
  ('events', 'Don''t Miss the Event', 'កុំខកខានព្រឹត្តិការណ៍', 9, 6),
  ('community', 'Community Pick', 'ជម្រើសរបស់សហគមន៍', 10, 18);

-- Insert default admin (password: Admin@BAM2024)
-- Password will need to be properly hashed when creating via API
INSERT OR IGNORE INTO admins (email, password_hash, name, role) VALUES
  ('admin@bam.com.kh', 'TEMP_HASH_REPLACE_VIA_API', 'Super Admin', 'super_admin');