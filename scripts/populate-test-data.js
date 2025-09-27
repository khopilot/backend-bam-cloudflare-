/**
 * Script to populate D1 database with test video data
 * Run with: npx wrangler d1 execute bamflix-db --local --file=./scripts/populate-test-data.sql
 */

const categories = ['politics', 'world', 'music', 'cars_motos', 'sports', 'travel', 'made_in_cambodia', 'latest', 'events', 'comedy', 'originals', 'community', 'education'];
const languages = ['km', 'en', 'fr', 'zh'];
const ageRatings = ['g', 'pg', 'pg-13', 'r'];

const videos = [];
const titles = [
  'Breaking News: Cambodia Development',
  'Traditional Khmer Dance Performance',
  'Tech Startup Success Story',
  'Angkor Wat Documentary',
  'Comedy Night Special',
  'Live Concert: Music Festival',
  'Street Food Tour',
  'Behind the Scenes',
  'Community Heroes',
  'Sports Highlights',
  'Political Analysis',
  'World Events Coverage',
  'Car Review Special',
  'Travel Guide Cambodia',
  'Educational Series',
  'BAM Original Production',
  'Event Coverage Live',
  'Comedy Show',
  'Music Video Hit',
  'Documentary Special'
];

// Generate 100 test videos
for (let i = 1; i <= 100; i++) {
  const category = categories[Math.floor(Math.random() * categories.length)];
  const title = titles[Math.floor(Math.random() * titles.length)] + ` Episode ${i}`;
  const titleKm = `វីដេអូ ${i} - ${category}`;
  const description = `This is test video ${i} for category ${category}. Experience the best content on BAM-flix platform.`;
  const thumbnailUrl = `https://picsum.photos/seed/video${i}/640/360`;
  const videoUrl = `https://test-videos.com/video${i}.mp4`;
  const previewUrl = `https://test-videos.com/preview${i}.mp4`;
  const duration = Math.floor(Math.random() * 7200) + 300; // 5 minutes to 2 hours
  const views = Math.floor(Math.random() * 1000000);
  const likes = Math.floor(Math.random() * 10000);
  const language = languages[Math.floor(Math.random() * languages.length)];
  const ageRating = ageRatings[Math.floor(Math.random() * ageRatings.length)];
  const releaseDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0];
  const tags = `${category},test,video${i},bamflix`;

  // Make some videos featured (first 10)
  const isFeatured = i <= 10 ? 1 : 0;
  const featuredOrder = i <= 10 ? i : null;

  // Make some originals
  const isOriginal = category === 'originals' || Math.random() > 0.8 ? 1 : 0;

  // Make some trending
  const isTrending = Math.random() > 0.7 ? 1 : 0;

  const status = 'active';

  videos.push({
    id: i,
    title,
    title_km: titleKm,
    description,
    thumbnail_url: thumbnailUrl,
    video_url: videoUrl,
    preview_url: previewUrl,
    category,
    duration,
    views,
    likes,
    language,
    age_rating: ageRating,
    release_date: releaseDate,
    tags,
    is_featured: isFeatured,
    featured_order: featuredOrder,
    is_original: isOriginal,
    is_trending: isTrending,
    status,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
}

// Generate SQL insert statements
console.log('-- BAM-flix Test Data Population Script');
console.log('-- This will insert 100 test videos into the database');
console.log('');
console.log('-- Clear existing test data (optional)');
console.log('-- DELETE FROM videos WHERE tags LIKE "%test%";');
console.log('');
console.log('-- Insert test videos');

videos.forEach(video => {
  const values = [
    video.id,
    `'${video.title.replace(/'/g, "''")}'`,
    video.title_km ? `'${video.title_km.replace(/'/g, "''")}'` : 'NULL',
    `'${video.description.replace(/'/g, "''")}'`,
    `'${video.thumbnail_url}'`,
    `'${video.video_url}'`,
    video.preview_url ? `'${video.preview_url}'` : 'NULL',
    `'${video.category}'`,
    video.duration,
    video.views,
    video.likes,
    `'${video.language}'`,
    `'${video.age_rating}'`,
    `'${video.release_date}'`,
    `'${video.tags}'`,
    video.is_featured,
    video.featured_order || 'NULL',
    video.is_original,
    video.is_trending,
    `'${video.status}'`,
    `'${video.created_at}'`,
    `'${video.updated_at}'`
  ];

  console.log(`INSERT INTO videos (id, title, title_km, description, thumbnail_url, video_url, preview_url, category, duration, views, likes, language, age_rating, release_date, tags, is_featured, featured_order, is_original, is_trending, status, created_at, updated_at) VALUES (${values.join(', ')});`);
});