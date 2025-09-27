import { Hono } from 'hono';
import type { Env } from '../types';
import { transformVideoForAPI } from '../utils/transform';

const videos = new Hono<{ Bindings: Env }>();

// Get featured videos for hero carousel
videos.get('/featured', async (c) => {
  const env = c.env;

  try {
    // Get featured videos from database
    const result = await env.DB.prepare(`
      SELECT * FROM videos
      WHERE featured = 1
      AND status = 'published'
      ORDER BY featured_order ASC, created_at DESC
      LIMIT 5
    `).all();

    let featuredVideos = result.results.map(transformVideoForAPI);

    // If no featured videos, get top videos as fallback
    if (featuredVideos.length === 0) {
      const topResult = await env.DB.prepare(`
        SELECT * FROM videos
        WHERE status = 'published'
        ORDER BY views DESC, likes DESC
        LIMIT 5
      `).all();

      featuredVideos = topResult.results.map(transformVideoForAPI);
    }

    // If still no videos, return mock data
    if (featuredVideos.length === 0) {
      featuredVideos = generateMockVideosForSection('featured').slice(0, 5);
    }

    return c.json({
      status: 'success',
      data: featuredVideos
    });
  } catch (error) {
    console.error('Featured videos error:', error);

    // Return mock data on error
    const mockVideos = generateMockVideosForSection('featured').slice(0, 5);
    return c.json({
      status: 'success',
      data: mockVideos
    });
  }
});

// Get videos by section key
videos.get('/section/:sectionKey', async (c) => {
  const sectionKey = c.req.param('sectionKey');
  const env = c.env;

  try {
    let query;
    let params: any[] = [];

    // Map section keys to database queries
    switch (sectionKey) {
      case 'you_may_like':
        // Personalized recommendations (for now, random selection)
        query = `
          SELECT * FROM videos
          WHERE status = 'published'
          ORDER BY RANDOM()
          LIMIT 18
        `;
        break;

      case 'keep_watching':
        // Popular videos with high view count
        query = `
          SELECT * FROM videos
          WHERE status = 'published'
          ORDER BY views DESC
          LIMIT 18
        `;
        break;

      case 'omg':
        // Controversial or viral content
        query = `
          SELECT * FROM videos
          WHERE status = 'published'
          AND (tags LIKE '%controversial%' OR tags LIKE '%viral%' OR tags LIKE '%omg%')
          ORDER BY views DESC
          LIMIT 18
        `;
        break;

      case 'world_watching':
        // International/Cambodia content
        query = `
          SELECT * FROM videos
          WHERE status = 'published'
          AND (category = 'world' OR tags LIKE '%cambodia%' OR tags LIKE '%international%')
          ORDER BY created_at DESC
          LIMIT 18
        `;
        break;

      case 'best_hit':
        // Top rated videos
        query = `
          SELECT * FROM videos
          WHERE status = 'published'
          ORDER BY likes DESC, views DESC
          LIMIT 10
        `;
        break;

      case 'comedy':
        // Comedy content
        query = `
          SELECT * FROM videos
          WHERE status = 'published'
          AND (category = 'comedy' OR tags LIKE '%comedy%' OR tags LIKE '%funny%')
          ORDER BY created_at DESC
          LIMIT 18
        `;
        break;

      case 'originals':
        // BAM original content
        query = `
          SELECT * FROM videos
          WHERE status = 'published'
          AND is_original = 1
          ORDER BY created_at DESC
          LIMIT 18
        `;
        break;

      case 'events':
        // Event content
        query = `
          SELECT * FROM videos
          WHERE status = 'published'
          AND (category = 'events' OR tags LIKE '%event%' OR tags LIKE '%live%')
          ORDER BY created_at DESC
          LIMIT 6
        `;
        break;

      case 'community':
        // Community picks
        query = `
          SELECT * FROM videos
          WHERE status = 'published'
          AND (tags LIKE '%community%' OR category = 'community')
          ORDER BY likes DESC
          LIMIT 18
        `;
        break;

      default:
        // Default to latest videos
        query = `
          SELECT * FROM videos
          WHERE status = 'published'
          ORDER BY created_at DESC
          LIMIT 18
        `;
    }

    const result = await env.DB.prepare(query).all();
    const sectionVideos = result.results.map(transformVideoForAPI);

    // If no videos found, generate mock data as fallback
    if (sectionVideos.length === 0) {
      const mockVideos = generateMockVideosForSection(sectionKey);
      return c.json({
        status: 'success',
        data: mockVideos
      });
    }

    return c.json({
      status: 'success',
      data: sectionVideos
    });
  } catch (error) {
    console.error(`Section ${sectionKey} error:`, error);

    // Return mock data on error
    const mockVideos = generateMockVideosForSection(sectionKey);
    return c.json({
      status: 'success',
      data: mockVideos
    });
  }
});

// Search videos - must be before /:id
videos.get('/search', async (c) => {
  const query = c.req.query('q') || '';
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;
  const env = c.env;

  if (!query) {
    return c.json({
      status: 'fail',
      message: 'Search query is required'
    }, 400);
  }

  try {
    const searchPattern = `%${query}%`;

    // Get total count
    const countResult = await env.DB.prepare(`
      SELECT COUNT(*) as total FROM videos
      WHERE status = 'published'
      AND (title LIKE ? OR title_km LIKE ? OR description LIKE ? OR tags LIKE ?)
    `).bind(searchPattern, searchPattern, searchPattern, searchPattern).first();
    const total = countResult?.total || 0;

    // Search videos
    const result = await env.DB.prepare(`
      SELECT * FROM videos
      WHERE status = 'published'
      AND (title LIKE ? OR title_km LIKE ? OR description LIKE ? OR tags LIKE ?)
      ORDER BY views DESC, created_at DESC
      LIMIT ? OFFSET ?
    `).bind(searchPattern, searchPattern, searchPattern, searchPattern, limit, offset).all();

    const searchResults = result.results.map(transformVideoForAPI);

    return c.json({
      status: 'success',
      data: searchResults,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    return c.json({
      status: 'fail',
      message: 'Search failed'
    }, 500);
  }
});

// Get all videos with pagination
videos.get('/', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;
  const env = c.env;

  try {
    // Get total count
    const countResult = await env.DB.prepare(
      `SELECT COUNT(*) as total FROM videos WHERE status = 'published'`
    ).first();
    const total = countResult?.total || 0;

    // Get videos
    const result = await env.DB.prepare(`
      SELECT * FROM videos
      WHERE status = 'published'
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

    const allVideos = result.results.map(transformVideoForAPI);

    return c.json({
      status: 'success',
      data: allVideos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Videos list error:', error);
    return c.json({
      status: 'fail',
      message: 'Failed to fetch videos'
    }, 500);
  }
});

// Get video by ID
videos.get('/:id', async (c) => {
  const id = c.req.param('id');
  const env = c.env;

  try {
    const video = await env.DB.prepare(
      `SELECT * FROM videos WHERE id = ? AND status = 'published'`
    ).bind(id).first();

    if (!video) {
      return c.json({
        status: 'fail',
        message: 'Video not found'
      }, 404);
    }

    return c.json({
      status: 'success',
      data: transformVideoForAPI(video)
    });
  } catch (error) {
    console.error('Video fetch error:', error);
    return c.json({
      status: 'fail',
      message: 'Failed to fetch video'
    }, 500);
  }
});

// Get videos by category
videos.get('/category/:category', async (c) => {
  const category = c.req.param('category');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;
  const env = c.env;

  try {
    // Get total count
    const countResult = await env.DB.prepare(
      `SELECT COUNT(*) as total FROM videos WHERE category = ? AND status = 'published'`
    ).bind(category).first();
    const total = countResult?.total || 0;

    // Get videos
    const result = await env.DB.prepare(`
      SELECT * FROM videos
      WHERE category = ? AND status = 'published'
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(category, limit, offset).all();

    const categoryVideos = result.results.map(transformVideoForAPI);

    return c.json({
      status: 'success',
      data: categoryVideos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Category videos error:', error);
    return c.json({
      status: 'fail',
      message: 'Failed to fetch category videos'
    }, 500);
  }
});

// Helper function to generate mock videos for sections with no data
function generateMockVideosForSection(sectionKey: string) {
  const sectionConfigs: Record<string, any> = {
    featured: { title: 'Featured Content', count: 18, badge: 'FEATURED' },
    you_may_like: { title: 'Recommended for You', count: 18 },
    keep_watching: { title: 'Continue Watching', count: 18 },
    omg: { title: 'OMG! Viral Videos', count: 18, badge: 'OMG!' },
    world_watching: { title: 'World is Watching', count: 18 },
    best_hit: { title: 'Top Hits', count: 10, badge: 'TOP' },
    comedy: { title: 'Comedy Special', count: 18 },
    originals: { title: 'BAM Original', count: 18, badge: 'ORIGINAL' },
    events: { title: 'Live Event', count: 6, badge: 'LIVE' },
    community: { title: 'Community Pick', count: 18 }
  };

  const config = sectionConfigs[sectionKey] || { title: 'Video', count: 18 };
  const videos = [];

  for (let i = 0; i < config.count; i++) {
    videos.push({
      id: `mock_${sectionKey}_${i}`,
      title: `${config.title} ${i + 1}`,
      titleKm: `វីដេអូ ${i + 1}`,
      description: `Experience the best of Cambodian content on BAM-flix`,
      thumbnailUrl: `https://picsum.photos/seed/${sectionKey}${i}/640/360`,
      videoUrl: '/sample-video.mp4',
      previewUrl: '/sample-preview.mp4',
      category: sectionKey,
      views: Math.floor(Math.random() * 1000000),
      likes: Math.floor(Math.random() * 10000),
      duration: Math.floor(Math.random() * 7200),
      badge: config.badge,
      watchProgress: sectionKey === 'keep_watching' ? Math.floor(Math.random() * 80) + 20 : 0,
      isOriginal: sectionKey === 'originals',
      language: 'km',
      ageRating: 'pg',
      createdAt: new Date().toISOString()
    });
  }

  return videos;
}

export default videos;