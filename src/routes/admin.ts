import { Hono } from 'hono';
import { validator } from 'hono/validator';
import { getCookie, setCookie } from 'hono/cookie';
import type { Env } from '../types';
import { hashPassword, verifyPassword, createToken, generateId, verifyToken } from '../utils/auth';
import { transformVideoForAPI, transformVideoForDB, transformToSnakeCase } from '../utils/transform';
import { generateUploadUrl, validateUploadParams, generateR2Key } from '../utils/r2';
import { requireAdmin } from '../middleware/auth';

const admin = new Hono<{ Bindings: Env }>();

// Admin login
admin.post('/login', async (c) => {
  const { email, password } = await c.req.json();
  const db = c.env.DB;

  try {
    const admin = await db
      .prepare('SELECT id, email, password_hash, name, role FROM admins WHERE email = ? AND is_active = 1')
      .bind(email)
      .first();

    if (!admin) {
      return c.json({
        status: 'fail',
        message: 'Invalid credentials'
      }, 401);
    }

    const isValid = await verifyPassword(password, admin.password_hash);
    if (!isValid) {
      return c.json({
        status: 'fail',
        message: 'Invalid credentials'
      }, 401);
    }

    // Update last login
    await db
      .prepare('UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(admin.id)
      .run();

    // Create admin JWT with special flag
    const token = await createToken(admin.id, admin.email, c.env.JWT_SECRET, { isAdmin: true, role: admin.role });

    // Set admin cookie
    setCookie(c, 'admin_jwt', token, {
      httpOnly: true,
      maxAge: 8 * 60 * 60, // 8 hours for admin sessions
      sameSite: 'None',
      secure: true
    });

    // Log admin activity
    await db
      .prepare('INSERT INTO admin_logs (admin_id, action, ip_address) VALUES (?, ?, ?)')
      .bind(admin.id, 'login', c.req.header('CF-Connecting-IP') || 'unknown')
      .run();

    return c.json({
      status: 'success',
      data: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return c.json({
      status: 'fail',
      message: 'Login failed'
    }, 500);
  }
});

// Admin logout
admin.post('/logout', requireAdmin, async (c) => {
  const adminId = c.get('adminId');

  // Log admin activity
  await c.env.DB
    .prepare('INSERT INTO admin_logs (admin_id, action) VALUES (?, ?)')
    .bind(adminId, 'logout')
    .run();

  // Clear admin cookie
  setCookie(c, 'admin_jwt', '', {
    httpOnly: true,
    maxAge: 1,
    sameSite: 'None',
    secure: true
  });

  return c.json({
    status: 'success',
    message: 'Logged out successfully'
  });
});

// Get current admin user
admin.get('/me', requireAdmin, async (c) => {
  const adminId = c.get('adminId');
  const db = c.env.DB;

  try {
    const adminUser = await db
      .prepare('SELECT id, email, name, role, last_login FROM admins WHERE id = ?')
      .bind(adminId)
      .first();

    if (!adminUser) {
      return c.json({
        status: 'fail',
        message: 'Admin not found'
      }, 404);
    }

    return c.json({
      status: 'success',
      data: {
        admin: {
          id: adminUser.id,
          email: adminUser.email,
          name: adminUser.name,
          role: adminUser.role
        }
      }
    });
  } catch (error) {
    console.error('Get admin me error:', error);
    return c.json({
      status: 'fail',
      message: 'Failed to fetch admin info'
    }, 500);
  }
});

// Get dashboard statistics
admin.get('/dashboard/stats', requireAdmin, async (c) => {
  const db = c.env.DB;

  try {
    // Get total videos
    const totalVideos = await db
      .prepare('SELECT COUNT(*) as count FROM videos')
      .first();

    // Get total views (sum from all videos)
    const totalViews = await db
      .prepare('SELECT SUM(views) as total FROM videos')
      .first();

    // Get total users (from users table if it exists)
    const totalUsers = await db
      .prepare('SELECT COUNT(*) as count FROM users')
      .first();

    // Get active events
    const activeEvents = await db
      .prepare('SELECT COUNT(*) as count FROM events WHERE status IN (?, ?)')
      .bind('upcoming', 'live')
      .first();

    // Get today's views from analytics (if data exists)
    const todayViews = await db
      .prepare('SELECT COALESCE(SUM(views), 0) as total FROM video_analytics WHERE date = ?')
      .bind(new Date().toISOString().split('T')[0])
      .first();

    // Get this week's views for growth calculation
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weeklyViews = await db
      .prepare('SELECT COALESCE(SUM(views), 0) as total FROM video_analytics WHERE date >= ?')
      .bind(weekAgo.toISOString().split('T')[0])
      .first();

    // Calculate mock growth percentage
    const weeklyGrowth = weeklyViews?.total > 0 ? 12.5 : 0;
    const monthlyGrowth = 25.3;

    // Mock total watch time (in seconds) - could be calculated from analytics
    const totalWatchTime = (totalVideos?.count || 0) * 1200; // Average 20 minutes per video

    return c.json({
      status: 'success',
      data: {
        totalVideos: totalVideos?.count || 0,
        totalViews: totalViews?.total || 0,
        totalUsers: totalUsers?.count || 0,
        totalWatchTime: totalWatchTime,
        activeEvents: activeEvents?.count || 0,
        todayViews: todayViews?.total || 0,
        weeklyGrowth: weeklyGrowth,
        monthlyGrowth: monthlyGrowth
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return c.json({
      status: 'fail',
      message: 'Failed to fetch dashboard statistics'
    }, 500);
  }
});

// Get all videos with filters
admin.get('/videos', requireAdmin, async (c) => {
  const db = c.env.DB;
  const { category, status, featured, page = 1, limit = 20 } = c.req.query();

  try {
    let query = 'SELECT v.*, a.name as uploaded_by_name FROM videos v LEFT JOIN admins a ON v.uploaded_by = a.id WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND v.category = ?';
      params.push(category);
    }

    if (status) {
      query += ' AND v.status = ?';
      params.push(status);
    }

    if (featured !== undefined) {
      query += ' AND v.featured = ?';
      params.push(featured === 'true' ? 1 : 0);
    }

    query += ' ORDER BY v.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);

    const videos = await db.prepare(query).bind(...params).all();

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM videos WHERE 1=1';
    const countParams = [];

    if (category) {
      countQuery += ' AND category = ?';
      countParams.push(category);
    }

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    if (featured !== undefined) {
      countQuery += ' AND featured = ?';
      countParams.push(featured === 'true' ? 1 : 0);
    }

    const count = await db.prepare(countQuery).bind(...countParams).first();

    // Transform videos to camelCase format
    const transformedVideos = videos.results ? videos.results.map(transformVideoForAPI) : [];

    return c.json({
      status: 'success',
      data: transformedVideos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count.total,
        pages: Math.ceil(count.total / limit)
      }
    });
  } catch (error) {
    console.error('Get videos error:', error);
    return c.json({
      status: 'fail',
      message: 'Failed to fetch videos'
    }, 500);
  }
});

// Create new video entry
admin.post('/videos', requireAdmin, async (c) => {
  const adminId = c.get('adminId');
  const db = c.env.DB;

  try {
    const data = await c.req.json();
    const videoId = generateId();

    // Validate required fields
    if (!data.title || !data.category) {
      return c.json({
        status: 'fail',
        message: 'Title and category are required'
      }, 400);
    }

    // Insert video
    await db
      .prepare(`
        INSERT INTO videos (
          id, title, title_km, description, description_km,
          thumbnail_url, preview_url, video_url, r2_key,
          category, subcategory, section, duration,
          badge, tags, language, status, uploaded_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        videoId,
        data.title,
        data.title_km || null,
        data.description || null,
        data.description_km || null,
        data.thumbnail_url || null,
        data.preview_url || null,
        data.video_url || null,
        data.r2_key || null,
        data.category,
        data.subcategory || null,
        data.section || null,
        data.duration || 0,
        data.badge || null,
        JSON.stringify(data.tags || []),
        data.language || 'km',
        'draft',
        adminId
      )
      .run();

    // Log admin activity
    await db
      .prepare('INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)')
      .bind(adminId, 'create', 'video', videoId, JSON.stringify({ title: data.title }))
      .run();

    return c.json({
      status: 'success',
      data: {
        id: videoId,
        message: 'Video created successfully'
      }
    }, 201);
  } catch (error) {
    console.error('Create video error:', error);
    return c.json({
      status: 'fail',
      message: 'Failed to create video'
    }, 500);
  }
});

// Update video
admin.put('/videos/:id', requireAdmin, async (c) => {
  const videoId = c.req.param('id');
  const adminId = c.get('adminId');
  const db = c.env.DB;

  try {
    const data = await c.req.json();

    // Build update query dynamically
    const updates = [];
    const params = [];

    const allowedFields = [
      'title', 'title_km', 'description', 'description_km',
      'thumbnail_url', 'preview_url', 'video_url', 'r2_key',
      'category', 'subcategory', 'section', 'duration',
      'badge', 'tags', 'language', 'status', 'featured',
      'featured_order', 'age_rating'
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(field === 'tags' ? JSON.stringify(data[field]) : data[field]);
      }
    }

    if (updates.length === 0) {
      return c.json({
        status: 'fail',
        message: 'No fields to update'
      }, 400);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(videoId);

    await db
      .prepare(`UPDATE videos SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...params)
      .run();

    // Log admin activity
    await db
      .prepare('INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)')
      .bind(adminId, 'update', 'video', videoId, JSON.stringify(data))
      .run();

    return c.json({
      status: 'success',
      message: 'Video updated successfully'
    });
  } catch (error) {
    console.error('Update video error:', error);
    return c.json({
      status: 'fail',
      message: 'Failed to update video'
    }, 500);
  }
});

// Publish video
admin.post('/videos/:id/publish', requireAdmin, async (c) => {
  const videoId = c.req.param('id');
  const adminId = c.get('adminId');
  const db = c.env.DB;

  try {
    // Check if video exists and has required fields
    const video = await db
      .prepare('SELECT id, title, video_url, thumbnail_url, r2_key, r2_thumbnail_key FROM videos WHERE id = ?')
      .bind(videoId)
      .first();

    if (!video) {
      return c.json({
        status: 'fail',
        message: 'Video not found'
      }, 404);
    }

    // Video must have either video_url OR r2_key
    if (!video.video_url && !video.r2_key) {
      return c.json({
        status: 'fail',
        message: 'Video must have a video file before publishing'
      }, 400);
    }

    // Thumbnail is optional - videos can use frontend placeholder if missing
    // But warn if missing
    if (!video.thumbnail_url && !video.r2_thumbnail_key) {
      console.warn(`Publishing video ${videoId} without thumbnail - frontend will use placeholder`);
    }

    // Publish the video
    await db
      .prepare('UPDATE videos SET status = ?, published_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind('published', videoId)
      .run();

    // Clear cache to show new content immediately
    await c.env.CACHE.delete('browse:KH');

    // Log admin activity
    await db
      .prepare('INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)')
      .bind(adminId, 'publish', 'video', videoId, JSON.stringify({ title: video.title }))
      .run();

    return c.json({
      status: 'success',
      message: 'Video published successfully'
    });
  } catch (error) {
    console.error('Publish video error:', error);
    return c.json({
      status: 'fail',
      message: 'Failed to publish video'
    }, 500);
  }
});

// Delete video
admin.delete('/videos/:id', requireAdmin, async (c) => {
  const videoId = c.req.param('id');
  const adminId = c.get('adminId');
  const adminRole = c.get('adminRole');
  const db = c.env.DB;

  // Only admins and super_admins can delete
  if (!['admin', 'super_admin'].includes(adminRole)) {
    return c.json({
      status: 'fail',
      message: 'Insufficient permissions'
    }, 403);
  }

  try {
    // Get video details for logging
    const video = await db
      .prepare('SELECT title, r2_key FROM videos WHERE id = ?')
      .bind(videoId)
      .first();

    if (!video) {
      return c.json({
        status: 'fail',
        message: 'Video not found'
      }, 404);
    }

    // Delete from database (cascades to analytics, watch_history, comments)
    await db
      .prepare('DELETE FROM videos WHERE id = ?')
      .bind(videoId)
      .run();

    // TODO: Delete from R2 storage if r2_key exists
    // if (video.r2_key && c.env.VIDEO_BUCKET) {
    //   await c.env.VIDEO_BUCKET.delete(video.r2_key);
    // }

    // Clear cache
    await c.env.CACHE.delete('browse:KH');

    // Log admin activity
    await db
      .prepare('INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)')
      .bind(adminId, 'delete', 'video', videoId, JSON.stringify({ title: video.title }))
      .run();

    return c.json({
      status: 'success',
      message: 'Video deleted successfully'
    });
  } catch (error) {
    console.error('Delete video error:', error);
    return c.json({
      status: 'fail',
      message: 'Failed to delete video'
    }, 500);
  }
});

// Get upload URL for R2
admin.post('/upload/request', requireAdmin, async (c) => {
  let requestBody;
  try {
    requestBody = await c.req.json();
    console.log('Upload request received:', JSON.stringify(requestBody));
  } catch (error) {
    console.error('Failed to parse request body:', error);
    return c.json({
      status: 'fail',
      message: 'Invalid JSON in request body'
    }, 400);
  }

  const { filename, contentType, fileSize } = requestBody;
  const adminId = c.get('adminId');

  console.log('Extracted fields:', { filename, contentType, fileSize });

  if (!filename || !contentType) {
    console.error('Missing required fields:', { filename: !!filename, contentType: !!contentType });
    return c.json({
      status: 'fail',
      message: `Missing required fields: ${!filename ? 'filename' : ''} ${!contentType ? 'contentType' : ''}`.trim()
    }, 400);
  }

  // Validate upload parameters
  const validation = validateUploadParams(filename, contentType, fileSize || 0);
  if (!validation.valid) {
    return c.json({
      status: 'fail',
      message: validation.error
    }, 400);
  }

  // Check if R2 API credentials are configured
  if (!c.env.R2_ACCESS_KEY_ID || !c.env.R2_SECRET_ACCESS_KEY) {
    console.error('R2 API credentials not configured');
    return c.json({
      status: 'error',
      message: 'Upload service not configured. Please contact administrator.'
    }, 500);
  }

  // Generate unique key for R2 - detect category based on content type
  const category = contentType.startsWith('image/') ? 'thumbnails' : 'videos';
  const r2Key = generateR2Key(category, filename);
  const bucketName = 'bam-videos-dev'; // This should match your R2 bucket name

  // Detailed logging for diagnostics
  console.log('[UPLOAD REQUEST] Details:', {
    filename,
    contentType,
    fileSize,
    category,
    r2Key,
    bucketName,
    adminId,
    hasR2Credentials: !!(c.env.R2_ACCESS_KEY_ID && c.env.R2_SECRET_ACCESS_KEY && c.env.R2_ACCOUNT_ID)
  });

  try {
    // Generate presigned URL for R2 upload using AWS SDK
    const uploadUrl = await generateUploadUrl(
      c.env,
      bucketName,
      r2Key,
      contentType,
      fileSize,
      3600 // 1 hour expiration
    );

    console.log('[PRESIGNED URL] Generated successfully:', {
      r2Key,
      urlLength: uploadUrl.length,
      urlStart: uploadUrl.substring(0, 100) + '...',
      expiresIn: 3600
    });

    return c.json({
      status: 'success',
      data: {
        r2Key,
        uploadUrl,
        expiresIn: 3600,
        bucketName,
        message: 'Upload URL generated successfully'
      }
    });
  } catch (error) {
    console.error('[PRESIGNED URL ERROR]', error);
    return c.json({
      status: 'error',
      message: 'Failed to generate upload URL'
    }, 500);
  }
});

// Handle video upload with metadata and R2 keys
admin.post('/videos/upload', requireAdmin, async (c) => {
  const adminId = c.get('adminId');
  const db = c.env.DB;

  try {
    // Log raw request body for debugging
    const rawBody = await c.req.text();
    console.log('Raw request body:', rawBody);
    console.log('Raw body first 100 chars:', rawBody.substring(0, 100));

    // Try to parse the JSON
    let jsonData;
    try {
      jsonData = JSON.parse(rawBody);
    } catch (parseError: any) {
      console.error('JSON Parse Error:', parseError.message);
      console.error('Failed to parse:', rawBody);
      return c.json({
        status: 'fail',
        message: `Invalid JSON: ${parseError.message}`
      }, 400);
    }

    console.log('Upload JSON data received:', JSON.stringify(jsonData, null, 2));
    console.log('Admin ID from context:', adminId);

    // Transform camelCase data to snake_case for database
    let videoData: any;
    try {
      console.log('Starting transformation...');
      videoData = transformToSnakeCase(jsonData);
      console.log('After snake_case transform:', JSON.stringify(videoData, null, 2));
    } catch (transformError: any) {
      console.error('Transformation error:', transformError);
      return c.json({
        status: 'fail',
        message: `Data transformation failed: ${transformError.message}`
      }, 500);
    }

    // Debug: Check specific fields
    console.log('Checking R2 key fields:');
    console.log('  videoData.video_r2key =', videoData.video_r2key);
    console.log('  videoData.r2_key =', videoData.r2_key);
    console.log('  videoData.thumbnail_r2key =', videoData.thumbnail_r2key);
    console.log('  videoData.r2_thumbnail_key =', videoData.r2_thumbnail_key);

    // Fix field mapping for R2 keys
    // Frontend sends videoR2Key -> video_r2key (without underscore between r2 and key), but DB field is r2_key
    if (videoData.video_r2key) {
      console.log('Mapping video_r2key to r2_key');
      videoData.r2_key = videoData.video_r2key;
      delete videoData.video_r2key;
    }

    // Frontend sends thumbnailR2Key -> thumbnail_r2_key, DB field is r2_thumbnail_key
    // Handle both formats: thumbnail_r2_key (correct) and thumbnail_r2key (incorrect)
    if (videoData.thumbnail_r2_key) {
      console.log('Thumbnail R2 key already in correct format:', videoData.thumbnail_r2_key);
    } else if (videoData.thumbnail_r2key) {
      console.log('Mapping thumbnail_r2key to r2_thumbnail_key');
      videoData.r2_thumbnail_key = videoData.thumbnail_r2key;
      delete videoData.thumbnail_r2key;
    }

    // Set defaults
    videoData.language = videoData.language || 'km';
    videoData.age_rating = videoData.age_rating || 'all';
    videoData.status = videoData.status || 'draft';

    // Validate required fields
    if (!videoData.title || !videoData.category) {
      console.error('Validation failed - missing required fields:', {
        title: videoData.title,
        category: videoData.category,
        allFields: Object.keys(videoData)
      });
      return c.json({
        status: 'fail',
        message: `Title and category are required. Received: title=${videoData.title}, category=${videoData.category}`
      }, 400);
    }

    // Validate R2 keys
    console.log('Checking final R2 key:', videoData.r2_key);
    if (!videoData.r2_key) {
      console.error('R2 key validation failed:', {
        r2_key: videoData.r2_key,
        availableKeys: Object.keys(videoData)
      });
      return c.json({
        status: 'fail',
        message: 'Video R2 key is required'
      }, 400);
    }

    // Generate video ID
    const videoId = generateId();

    // Store R2 keys for database
    const r2VideoKey = videoData.r2_key;
    const r2ThumbnailKey = videoData.r2_thumbnail_key || null;

    // Generate public R2 URLs for playback
    // NOTE: Using old public bucket until files are migrated to bam-videos-dev
    const publicVideoUrl = `https://pub-62c87b54235641df85ebb48de117b75d.r2.dev/${r2VideoKey}`;
    const publicThumbnailUrl = r2ThumbnailKey ? `https://pub-62c87b54235641df85ebb48de117b75d.r2.dev/${r2ThumbnailKey}` : null;

    // Prepare database record with public R2 URLs
    const dbRecord = {
      id: videoId,
      title: videoData.title,
      title_km: videoData.title_km || null,
      description: videoData.description || null,
      description_km: videoData.description_km || null,
      thumbnail_url: publicThumbnailUrl,
      video_url: publicVideoUrl,
      r2_key: r2VideoKey,
      r2_thumbnail_key: r2ThumbnailKey,
      category: videoData.category,
      subcategory: videoData.subcategory || null,
      section: videoData.section || null,
      language: videoData.language,
      age_rating: videoData.age_rating,
      badge: videoData.badge || null,
      tags: videoData.tags ? JSON.stringify(Array.isArray(videoData.tags) ? videoData.tags : []) : null,
      status: videoData.status,
      uploaded_by: adminId,
      scheduled_at: videoData.scheduled_at || null,
      orientation: videoData.orientation || 'portrait',
      aspect_ratio: videoData.aspect_ratio || '9:16'
    };

    // Insert video record
    console.log('Attempting database insert with:', JSON.stringify(dbRecord, null, 2));

    try {
      const result = await db
        .prepare(`
          INSERT INTO videos (
            id, title, title_km, description, description_km,
            thumbnail_url, video_url, r2_key, r2_thumbnail_key, category, subcategory, section,
            language, age_rating, badge, tags, status, uploaded_by,
            scheduled_at, orientation, aspect_ratio
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          dbRecord.id, dbRecord.title, dbRecord.title_km, dbRecord.description, dbRecord.description_km,
          dbRecord.thumbnail_url, dbRecord.video_url, dbRecord.r2_key, dbRecord.r2_thumbnail_key,
          dbRecord.category, dbRecord.subcategory, dbRecord.section,
          dbRecord.language, dbRecord.age_rating, dbRecord.badge, dbRecord.tags, dbRecord.status,
          dbRecord.uploaded_by, dbRecord.scheduled_at, dbRecord.orientation, dbRecord.aspect_ratio
        )
        .run();

      console.log('Database insert successful:', result);
    } catch (dbError: any) {
      console.error('=== DATABASE INSERT ERROR ===');
      console.error('Error object:', dbError);
      console.error('Error message:', dbError.message);
      console.error('Error stack:', dbError.stack);
      console.error('Admin ID used:', adminId);
      console.error('DB Record attempted:', JSON.stringify(dbRecord, null, 2));
      throw new Error(`Database insert failed: ${dbError.message}`);
    }

    // Clear cache so new videos appear immediately (if published)
    if (dbRecord.status === 'published') {
      await c.env.CACHE.delete('browse:KH');
      console.log('Cache cleared for newly published video');
    }

    // Log admin activity
    await db
      .prepare('INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)')
      .bind(adminId, 'video_upload', 'video', videoId, JSON.stringify({ title: dbRecord.title, category: dbRecord.category, status: dbRecord.status, r2_key: r2VideoKey }))
      .run();

    // Return response with camelCase data
    const responseData = transformVideoForAPI(dbRecord);

    return c.json({
      status: 'success',
      message: 'Video uploaded successfully with R2 storage',
      data: {
        ...responseData,
        r2VideoKey,
        r2ThumbnailKey
      }
    });
  } catch (error: any) {
    console.error('Video upload error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    // Return more detailed error for debugging
    return c.json({
      status: 'fail',
      message: `Failed to upload video: ${error.message}`,
      error: {
        message: error.message,
        stack: error.stack
      }
    }, 500);
  }
});

// ===== ANALYTICS ENDPOINTS =====

// Helper function to get date range
function getDateRange(period: string): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = now.toISOString().split('T')[0];
  let startDate: string;

  switch (period) {
    case 'today':
      startDate = endDate;
      break;
    case '7d':
      const week = new Date(now);
      week.setDate(week.getDate() - 7);
      startDate = week.toISOString().split('T')[0];
      break;
    case '30d':
      const month = new Date(now);
      month.setDate(month.getDate() - 30);
      startDate = month.toISOString().split('T')[0];
      break;
    case '90d':
      const quarter = new Date(now);
      quarter.setDate(quarter.getDate() - 90);
      startDate = quarter.toISOString().split('T')[0];
      break;
    default:
      const defaultWeek = new Date(now);
      defaultWeek.setDate(defaultWeek.getDate() - 7);
      startDate = defaultWeek.toISOString().split('T')[0];
  }

  return { startDate, endDate };
}

// Get analytics overview with date ranges
admin.get('/analytics/overview', requireAdmin, async (c) => {
  const db = c.env.DB;
  const period = c.req.query('period') || '7d';
  const { startDate, endDate } = getDateRange(period);

  try {
    // Total videos and views
    const totals = await db
      .prepare(`
        SELECT
          COUNT(*) as total_videos,
          COUNT(CASE WHEN status = 'published' THEN 1 END) as published_videos,
          SUM(views) as total_views,
          SUM(likes) as total_likes,
          SUM(shares) as total_shares,
          SUM(comments_count) as total_comments
        FROM videos
      `)
      .first();

    // Total users
    const users = await db
      .prepare('SELECT COUNT(*) as total_users FROM users')
      .first();

    // Period-specific metrics
    const periodStats = await db
      .prepare(`
        SELECT
          SUM(views) as period_views,
          SUM(unique_viewers) as period_unique_viewers,
          SUM(watch_time) as period_watch_time,
          AVG(completion_rate) as avg_completion_rate
        FROM video_analytics
        WHERE date >= ? AND date <= ?
      `)
      .bind(startDate, endDate)
      .first();

    // Views trend (daily breakdown)
    const viewsTrend = await db
      .prepare(`
        SELECT
          date,
          SUM(views) as views,
          SUM(unique_viewers) as unique_viewers
        FROM video_analytics
        WHERE date >= ? AND date <= ?
        GROUP BY date
        ORDER BY date ASC
      `)
      .bind(startDate, endDate)
      .all();

    // Engagement rate
    const engagementRate = totals?.total_views > 0
      ? ((Number(totals.total_likes) + Number(totals.total_shares)) / Number(totals.total_views)) * 100
      : 0;

    return c.json({
      status: 'success',
      data: {
        period: { startDate, endDate, label: period },
        overview: {
          totalVideos: totals?.total_videos || 0,
          publishedVideos: totals?.published_videos || 0,
          totalViews: totals?.total_views || 0,
          totalUsers: users?.total_users || 0,
          totalLikes: totals?.total_likes || 0,
          totalShares: totals?.total_shares || 0,
          totalComments: totals?.total_comments || 0,
          engagementRate: engagementRate.toFixed(2)
        },
        periodMetrics: {
          views: periodStats?.period_views || 0,
          uniqueViewers: periodStats?.period_unique_viewers || 0,
          watchTime: periodStats?.period_watch_time || 0,
          avgCompletionRate: periodStats?.avg_completion_rate || 0
        },
        viewsTrend: viewsTrend.results || []
      }
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    return c.json({
      status: 'fail',
      message: 'Failed to fetch analytics overview'
    }, 500);
  }
});

// Get top performing videos
admin.get('/analytics/videos/top', requireAdmin, async (c) => {
  const db = c.env.DB;
  const limit = parseInt(c.req.query('limit') || '10');
  const metric = c.req.query('metric') || 'views'; // views, likes, shares, engagement

  try {
    // Build query based on metric to avoid SQL injection and D1 dynamic ORDER BY issues
    let query = '';

    if (metric === 'likes') {
      query = `
        SELECT
          v.id,
          v.title,
          v.title_km as titleKm,
          v.thumbnail_url as thumbnailUrl,
          v.category,
          v.views,
          v.likes,
          v.shares,
          v.comments_count as commentsCount,
          v.published_at as publishedAt,
          v.duration,
          ROUND((v.likes + v.shares) * 100.0 / NULLIF(v.views, 0), 2) as engagementRate,
          COALESCE(AVG(va.completion_rate), 0) as avgCompletionRate
        FROM videos v
        LEFT JOIN video_analytics va ON v.id = va.video_id
        WHERE v.status = 'published'
        GROUP BY v.id
        ORDER BY v.likes DESC
        LIMIT ?
      `;
    } else if (metric === 'shares') {
      query = `
        SELECT
          v.id,
          v.title,
          v.title_km as titleKm,
          v.thumbnail_url as thumbnailUrl,
          v.category,
          v.views,
          v.likes,
          v.shares,
          v.comments_count as commentsCount,
          v.published_at as publishedAt,
          v.duration,
          ROUND((v.likes + v.shares) * 100.0 / NULLIF(v.views, 0), 2) as engagementRate,
          COALESCE(AVG(va.completion_rate), 0) as avgCompletionRate
        FROM videos v
        LEFT JOIN video_analytics va ON v.id = va.video_id
        WHERE v.status = 'published'
        GROUP BY v.id
        ORDER BY v.shares DESC
        LIMIT ?
      `;
    } else if (metric === 'engagement') {
      query = `
        SELECT
          v.id,
          v.title,
          v.title_km as titleKm,
          v.thumbnail_url as thumbnailUrl,
          v.category,
          v.views,
          v.likes,
          v.shares,
          v.comments_count as commentsCount,
          v.published_at as publishedAt,
          v.duration,
          ROUND((v.likes + v.shares) * 100.0 / NULLIF(v.views, 0), 2) as engagementRate,
          COALESCE(AVG(va.completion_rate), 0) as avgCompletionRate
        FROM videos v
        LEFT JOIN video_analytics va ON v.id = va.video_id
        WHERE v.status = 'published'
        GROUP BY v.id
        ORDER BY (v.likes + v.shares) DESC
        LIMIT ?
      `;
    } else {
      // Default to views
      query = `
        SELECT
          v.id,
          v.title,
          v.title_km as titleKm,
          v.thumbnail_url as thumbnailUrl,
          v.category,
          v.views,
          v.likes,
          v.shares,
          v.comments_count as commentsCount,
          v.published_at as publishedAt,
          v.duration,
          ROUND((v.likes + v.shares) * 100.0 / NULLIF(v.views, 0), 2) as engagementRate,
          COALESCE(AVG(va.completion_rate), 0) as avgCompletionRate
        FROM videos v
        LEFT JOIN video_analytics va ON v.id = va.video_id
        WHERE v.status = 'published'
        GROUP BY v.id
        ORDER BY v.views DESC
        LIMIT ?
      `;
    }

    const topVideos = await db.prepare(query).bind(limit).all();

    return c.json({
      status: 'success',
      data: topVideos.results || []
    });
  } catch (error) {
    console.error('Top videos error:', error);
    return c.json({
      status: 'fail',
      message: 'Failed to fetch top videos'
    }, 500);
  }
});

// Get individual video analytics
admin.get('/analytics/videos/:id', requireAdmin, async (c) => {
  const videoId = c.req.param('id');
  const db = c.env.DB;
  const period = c.req.query('period') || '30d';
  const { startDate, endDate } = getDateRange(period);

  try {
    // Video basic info
    const video = await db
      .prepare(`
        SELECT
          id, title, title_km, thumbnail_url, category,
          views, likes, shares, comments_count,
          duration, published_at, status
        FROM videos
        WHERE id = ?
      `)
      .bind(videoId)
      .first();

    if (!video) {
      return c.json({
        status: 'fail',
        message: 'Video not found'
      }, 404);
    }

    // Views over time
    const viewsOverTime = await db
      .prepare(`
        SELECT
          date,
          SUM(views) as views,
          SUM(unique_viewers) as unique_viewers,
          SUM(watch_time) as watch_time,
          AVG(completion_rate) as completion_rate
        FROM video_analytics
        WHERE video_id = ? AND date >= ? AND date <= ?
        GROUP BY date
        ORDER BY date ASC
      `)
      .bind(videoId, startDate, endDate)
      .all();

    // Geographic distribution
    const geoDistribution = await db
      .prepare(`
        SELECT
          region,
          SUM(views) as views,
          SUM(unique_viewers) as unique_viewers
        FROM video_analytics
        WHERE video_id = ? AND date >= ? AND date <= ?
        GROUP BY region
        ORDER BY views DESC
      `)
      .bind(videoId, startDate, endDate)
      .all();

    // Device breakdown
    const deviceBreakdown = await db
      .prepare(`
        SELECT
          device_type,
          SUM(views) as views,
          SUM(unique_viewers) as unique_viewers
        FROM video_analytics
        WHERE video_id = ? AND date >= ? AND date <= ?
        GROUP BY device_type
        ORDER BY views DESC
      `)
      .bind(videoId, startDate, endDate)
      .all();

    // Watch completion funnel
    const completionFunnel = await db
      .prepare(`
        SELECT
          CASE
            WHEN completion_percentage >= 90 THEN '90-100%'
            WHEN completion_percentage >= 75 THEN '75-90%'
            WHEN completion_percentage >= 50 THEN '50-75%'
            WHEN completion_percentage >= 25 THEN '25-50%'
            ELSE '0-25%'
          END as completion_range,
          COUNT(*) as count
        FROM watch_history
        WHERE video_id = ?
        GROUP BY completion_range
        ORDER BY completion_range DESC
      `)
      .bind(videoId)
      .all();

    return c.json({
      status: 'success',
      data: {
        video,
        period: { startDate, endDate, label: period },
        viewsOverTime: viewsOverTime.results || [],
        geoDistribution: geoDistribution.results || [],
        deviceBreakdown: deviceBreakdown.results || [],
        completionFunnel: completionFunnel.results || []
      }
    });
  } catch (error) {
    console.error('Video analytics error:', error);
    return c.json({
      status: 'fail',
      message: 'Failed to fetch video analytics'
    }, 500);
  }
});

// Get engagement trends
admin.get('/analytics/engagement', requireAdmin, async (c) => {
  const db = c.env.DB;
  const period = c.req.query('period') || '30d';
  const { startDate, endDate } = getDateRange(period);

  try {
    // Daily engagement metrics
    const engagementTrend = await db
      .prepare(`
        SELECT
          date,
          SUM(likes) as likes,
          SUM(shares) as shares,
          SUM(views) as views,
          ROUND((SUM(likes) + SUM(shares)) * 100.0 / NULLIF(SUM(views), 0), 2) as engagement_rate
        FROM video_analytics
        WHERE date >= ? AND date <= ?
        GROUP BY date
        ORDER BY date ASC
      `)
      .bind(startDate, endDate)
      .all();

    // Category engagement
    const categoryEngagement = await db
      .prepare(`
        SELECT
          category,
          SUM(views) as views,
          SUM(likes) as likes,
          SUM(shares) as shares,
          ROUND((SUM(likes) + SUM(shares)) * 100.0 / NULLIF(SUM(views), 0), 2) as engagement_rate
        FROM videos
        WHERE status = 'published'
        GROUP BY category
        ORDER BY engagement_rate DESC
      `)
      .all();

    return c.json({
      status: 'success',
      data: {
        period: { startDate, endDate, label: period },
        engagementTrend: engagementTrend.results || [],
        categoryEngagement: categoryEngagement.results || []
      }
    });
  } catch (error) {
    console.error('Engagement analytics error:', error);
    return c.json({
      status: 'fail',
      message: 'Failed to fetch engagement analytics'
    }, 500);
  }
});

// Get user growth analytics
admin.get('/analytics/users/growth', requireAdmin, async (c) => {
  const db = c.env.DB;
  const period = c.req.query('period') || '30d';
  const { startDate, endDate } = getDateRange(period);

  try {
    // User signups over time
    const userGrowth = await db
      .prepare(`
        SELECT
          DATE(created_at) as date,
          COUNT(*) as new_users
        FROM users
        WHERE DATE(created_at) >= ? AND DATE(created_at) <= ?
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `)
      .bind(startDate, endDate)
      .all();

    // Total users
    const totalUsers = await db
      .prepare('SELECT COUNT(*) as count FROM users')
      .first();

    // Profiles created
    const totalProfiles = await db
      .prepare('SELECT COUNT(*) as count FROM profiles')
      .first();

    // Average profiles per user
    const avgProfilesPerUser = totalUsers?.count > 0
      ? (Number(totalProfiles?.count) / Number(totalUsers?.count)).toFixed(2)
      : 0;

    return c.json({
      status: 'success',
      data: {
        period: { startDate, endDate, label: period },
        totalUsers: totalUsers?.count || 0,
        totalProfiles: totalProfiles?.count || 0,
        avgProfilesPerUser,
        userGrowth: userGrowth.results || []
      }
    });
  } catch (error) {
    console.error('User growth analytics error:', error);
    return c.json({
      status: 'fail',
      message: 'Failed to fetch user growth analytics'
    }, 500);
  }
});

// Get category performance
admin.get('/analytics/categories', requireAdmin, async (c) => {
  const db = c.env.DB;

  try {
    const categoryStats = await db
      .prepare(`
        SELECT
          category,
          COUNT(*) as video_count,
          SUM(views) as total_views,
          SUM(likes) as total_likes,
          SUM(shares) as total_shares,
          AVG(views) as avg_views_per_video,
          ROUND((SUM(likes) + SUM(shares)) * 100.0 / NULLIF(SUM(views), 0), 2) as engagement_rate
        FROM videos
        WHERE status = 'published'
        GROUP BY category
        ORDER BY total_views DESC
      `)
      .all();

    // Transform snake_case to camelCase for frontend
    const formattedStats = (categoryStats.results || []).map((cat: any) => ({
      category: cat.category,
      videoCount: cat.video_count,
      totalViews: cat.total_views,
      totalLikes: cat.total_likes,
      totalShares: cat.total_shares,
      avgViewsPerVideo: cat.avg_views_per_video,
      engagementRate: cat.engagement_rate
    }));

    return c.json({
      status: 'success',
      data: formattedStats
    });
  } catch (error) {
    console.error('Category analytics error:', error);
    return c.json({
      status: 'fail',
      message: 'Failed to fetch category analytics'
    }, 500);
  }
});

// Legacy analytics endpoint (keep for backward compatibility)
admin.get('/analytics', requireAdmin, async (c) => {
  const db = c.env.DB;
  const { period = '7' } = c.req.query(); // days

  try {
    // Get overview stats
    const stats = await db
      .prepare(`
        SELECT
          COUNT(DISTINCT v.id) as total_videos,
          COUNT(DISTINCT CASE WHEN v.status = 'published' THEN v.id END) as published_videos,
          SUM(v.views) as total_views,
          COUNT(DISTINCT u.id) as total_users
        FROM videos v
        CROSS JOIN users u
      `)
      .first();

    // Get recent video performance
    const recentVideos = await db
      .prepare(`
        SELECT
          v.id, v.title, v.views, v.likes, v.published_at,
          ROUND(AVG(va.completion_rate), 2) as avg_completion
        FROM videos v
        LEFT JOIN video_analytics va ON v.id = va.video_id
        WHERE v.status = 'published'
          AND v.published_at >= datetime('now', '-${period} days')
        GROUP BY v.id
        ORDER BY v.views DESC
        LIMIT 10
      `)
      .all();

    // Get category breakdown
    const categories = await db
      .prepare(`
        SELECT
          category,
          COUNT(*) as video_count,
          SUM(views) as total_views
        FROM videos
        WHERE status = 'published'
        GROUP BY category
        ORDER BY total_views DESC
      `)
      .all();

    return c.json({
      status: 'success',
      data: {
        overview: stats,
        recentVideos: recentVideos.results,
        categoryBreakdown: categories.results,
        period: `${period} days`
      }
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return c.json({
      status: 'fail',
      message: 'Failed to fetch analytics'
    }, 500);
  }
});

// ===== USER ANALYTICS ENDPOINTS =====

// Get detailed user analytics
admin.get('/analytics/users/detailed', requireAdmin, async (c) => {
  const db = c.env.DB;
  const period = c.req.query('period') || '30d';
  const { startDate, endDate } = getDateRange(period);

  try {
    // Total and new users
    const userCounts = await db
      .prepare(`
        SELECT
          COUNT(*) as total_users,
          COUNT(CASE WHEN DATE(created_at) >= ? AND DATE(created_at) <= ? THEN 1 END) as new_users
        FROM users
      `)
      .bind(startDate, endDate)
      .first();

    // Active users (users with watch history in period)
    const activeUsers = await db
      .prepare(`
        SELECT COUNT(DISTINCT user_id) as active_users
        FROM watch_history
        WHERE DATE(last_watched) >= ? AND DATE(last_watched) <= ?
      `)
      .bind(startDate, endDate)
      .first();

    // Average profiles per user
    const profileStats = await db
      .prepare(`
        SELECT
          COUNT(*) as total_profiles,
          COUNT(DISTINCT user_id) as users_with_profiles
        FROM profiles
      `)
      .first();

    const avgProfilesPerUser = profileStats?.users_with_profiles > 0
      ? (Number(profileStats.total_profiles) / Number(profileStats.users_with_profiles)).toFixed(2)
      : 0;

    // Total watch time
    const watchTimeStats = await db
      .prepare(`
        SELECT
          SUM(wh.completion_percentage * v.duration / 100) as total_watch_time_seconds,
          COUNT(DISTINCT wh.user_id) as users_with_watch_time
        FROM watch_history wh
        JOIN videos v ON wh.video_id = v.id
        WHERE DATE(wh.last_watched) >= ? AND DATE(wh.last_watched) <= ?
      `)
      .bind(startDate, endDate)
      .first();

    const totalWatchTimeHours = watchTimeStats?.total_watch_time_seconds
      ? Math.round(Number(watchTimeStats.total_watch_time_seconds) / 3600)
      : 0;

    const avgSessionDuration = watchTimeStats?.users_with_watch_time > 0
      ? Math.round((Number(watchTimeStats.total_watch_time_seconds) / Number(watchTimeStats.users_with_watch_time)) / 60)
      : 0;

    // Engagement score (composite: 0-100)
    const engagementData = await db
      .prepare(`
        SELECT
          COUNT(DISTINCT wh.user_id) as active_users,
          COUNT(DISTINCT c.user_id) as commenting_users,
          AVG(wh.completion_percentage) as avg_completion
        FROM watch_history wh
        LEFT JOIN comments c ON wh.user_id = c.user_id
        WHERE DATE(wh.last_watched) >= ? AND DATE(wh.last_watched) <= ?
      `)
      .bind(startDate, endDate)
      .first();

    const engagementScore = Math.min(100, Math.round(
      (Number(engagementData?.avg_completion) || 0) * 0.5 +
      ((Number(engagementData?.commenting_users) / Math.max(1, Number(engagementData?.active_users))) * 100) * 0.3 +
      ((Number(activeUsers?.active_users) / Math.max(1, Number(userCounts?.total_users))) * 100) * 0.2
    ));

    // User growth trend
    const growth = await db
      .prepare(`
        SELECT
          DATE(created_at) as date,
          COUNT(*) as new_users
        FROM users
        WHERE DATE(created_at) >= ? AND DATE(created_at) <= ?
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `)
      .bind(startDate, endDate)
      .all();

    // Calculate cumulative
    let cumulative = await db
      .prepare('SELECT COUNT(*) as count FROM users WHERE DATE(created_at) < ?')
      .bind(startDate)
      .first();

    let runningTotal = Number(cumulative?.count) || 0;
    const growthWithCumulative = (growth.results || []).map((day: any) => {
      runningTotal += Number(day.new_users);
      return {
        date: day.date,
        newUsers: Number(day.new_users),
        cumulativeUsers: runningTotal
      };
    });

    // Registration methods
    const registrationMethods = await db
      .prepare(`
        SELECT
          CASE
            WHEN oauth_provider IS NOT NULL THEN oauth_provider
            WHEN email IS NOT NULL THEN 'email'
            WHEN phone_number IS NOT NULL THEN 'phone'
            ELSE 'unknown'
          END as method,
          COUNT(*) as count
        FROM users
        GROUP BY method
      `)
      .all();

    const totalForPercentage = Number(userCounts?.total_users) || 1;
    const methodsWithPercentage = (registrationMethods.results || []).map((m: any) => ({
      method: m.method,
      count: Number(m.count),
      percentage: ((Number(m.count) / totalForPercentage) * 100).toFixed(1)
    }));

    return c.json({
      status: 'success',
      data: {
        overview: {
          totalUsers: Number(userCounts?.total_users) || 0,
          newUsers: Number(userCounts?.new_users) || 0,
          activeUsers: Number(activeUsers?.active_users) || 0,
          avgProfilesPerUser: Number(avgProfilesPerUser),
          totalWatchTimeHours,
          avgSessionDuration,
          engagementScore
        },
        growth: growthWithCumulative,
        registrationMethods: methodsWithPercentage
      }
    });
  } catch (error) {
    console.error('User analytics detailed error:', error);
    return c.json({
      status: 'fail',
      message: 'Failed to fetch detailed user analytics'
    }, 500);
  }
});

// Get user engagement analytics
admin.get('/analytics/users/engagement', requireAdmin, async (c) => {
  const db = c.env.DB;
  const period = c.req.query('period') || '30d';
  const { startDate, endDate } = getDateRange(period);

  try {
    // Watch time distribution
    const watchTimeData = await db
      .prepare(`
        SELECT
          user_id,
          SUM(wh.completion_percentage * v.duration / 100 / 3600) as watch_hours
        FROM watch_history wh
        JOIN videos v ON wh.video_id = v.id
        WHERE DATE(wh.last_watched) >= ? AND DATE(wh.last_watched) <= ?
        GROUP BY user_id
      `)
      .bind(startDate, endDate)
      .all();

    // Group into ranges
    const watchTimeDistribution = [
      { range: '0-1h', count: 0 },
      { range: '1-5h', count: 0 },
      { range: '5-10h', count: 0 },
      { range: '10-20h', count: 0 },
      { range: '20+h', count: 0 }
    ];

    (watchTimeData.results || []).forEach((user: any) => {
      const hours = Number(user.watch_hours);
      if (hours < 1) watchTimeDistribution[0].count++;
      else if (hours < 5) watchTimeDistribution[1].count++;
      else if (hours < 10) watchTimeDistribution[2].count++;
      else if (hours < 20) watchTimeDistribution[3].count++;
      else watchTimeDistribution[4].count++;
    });

    // Top engaged users
    const topEngagedUsers = await db
      .prepare(`
        SELECT
          u.id,
          u.display_name,
          u.email,
          COUNT(DISTINCT wh.video_id) as videos_watched,
          SUM(wh.completion_percentage * v.duration / 100) as total_watch_time_seconds,
          COUNT(DISTINCT wh.profile_id) as profiles_used,
          MAX(wh.last_watched) as last_active
        FROM users u
        JOIN watch_history wh ON u.id = wh.user_id
        JOIN videos v ON wh.video_id = v.id
        WHERE DATE(wh.last_watched) >= ? AND DATE(wh.last_watched) <= ?
        GROUP BY u.id
        ORDER BY total_watch_time_seconds DESC
        LIMIT 20
      `)
      .bind(startDate, endDate)
      .all();

    // Profile distribution
    const profileDistribution = await db
      .prepare(`
        SELECT
          profile_count,
          COUNT(*) as user_count
        FROM (
          SELECT user_id, COUNT(*) as profile_count
          FROM profiles
          GROUP BY user_id
        )
        GROUP BY profile_count
        ORDER BY profile_count
      `)
      .all();

    return c.json({
      status: 'success',
      data: {
        watchTimeDistribution,
        topEngagedUsers: (topEngagedUsers.results || []).map((u: any) => ({
          userId: u.id,
          displayName: u.display_name || 'Anonymous',
          email: u.email,
          videosWatched: Number(u.videos_watched),
          totalWatchTime: Number(u.total_watch_time_seconds),
          profilesUsed: Number(u.profiles_used),
          lastActive: u.last_active
        })),
        profileDistribution: (profileDistribution.results || []).map((p: any) => ({
          profileCount: Number(p.profile_count),
          userCount: Number(p.user_count)
        }))
      }
    });
  } catch (error) {
    console.error('User engagement analytics error:', error);
    return c.json({
      status: 'fail',
      message: 'Failed to fetch user engagement analytics'
    }, 500);
  }
});

// Get user activity analytics
admin.get('/analytics/users/activity', requireAdmin, async (c) => {
  const db = c.env.DB;
  const period = c.req.query('period') || '7d';
  const { startDate, endDate } = getDateRange(period);

  try {
    // Active users trend (DAU/WAU/MAU)
    const activeUsersTrend = await db
      .prepare(`
        SELECT
          DATE(last_watched) as date,
          COUNT(DISTINCT user_id) as active_users
        FROM watch_history
        WHERE DATE(last_watched) >= ? AND DATE(last_watched) <= ?
        GROUP BY DATE(last_watched)
        ORDER BY date ASC
      `)
      .bind(startDate, endDate)
      .all();

    // Device preferences (from video_analytics)
    const devicePreferences = await db
      .prepare(`
        SELECT
          device_type,
          COUNT(DISTINCT user_id) as user_count
        FROM video_analytics va
        JOIN watch_history wh ON va.video_id = wh.video_id AND va.date = DATE(wh.last_watched)
        WHERE va.date >= ? AND va.date <= ?
        GROUP BY device_type
      `)
      .bind(startDate, endDate)
      .all();

    const totalDeviceUsers = (devicePreferences.results || []).reduce((sum: number, d: any) => sum + Number(d.user_count), 0) || 1;
    const devicesWithPercentage = (devicePreferences.results || []).map((d: any) => ({
      device: d.device_type,
      percentage: ((Number(d.user_count) / totalDeviceUsers) * 100).toFixed(1)
    }));

    // Average comments per user
    const commentStats = await db
      .prepare(`
        SELECT
          COUNT(*) as total_comments,
          COUNT(DISTINCT user_id) as commenting_users
        FROM comments
        WHERE DATE(created_at) >= ? AND DATE(created_at) <= ?
      `)
      .bind(startDate, endDate)
      .first();

    const avgCommentsPerUser = commentStats?.commenting_users > 0
      ? (Number(commentStats.total_comments) / Number(commentStats.commenting_users)).toFixed(1)
      : 0;

    return c.json({
      status: 'success',
      data: {
        activeUsersTrend: (activeUsersTrend.results || []).map((d: any) => ({
          date: d.date,
          activeUsers: Number(d.active_users)
        })),
        devicePreferences: devicesWithPercentage,
        avgCommentsPerUser: Number(avgCommentsPerUser)
      }
    });
  } catch (error) {
    console.error('User activity analytics error:', error);
    return c.json({
      status: 'fail',
      message: 'Failed to fetch user activity analytics'
    }, 500);
  }
});

// Get user profile details
admin.get('/analytics/users/:userId/profile', requireAdmin, async (c) => {
  const userId = c.req.param('userId');
  const db = c.env.DB;

  try {
    // User basic info
    const user = await db
      .prepare('SELECT id, email, phone_number, display_name, oauth_provider, created_at FROM users WHERE id = ?')
      .bind(userId)
      .first();

    if (!user) {
      return c.json({
        status: 'fail',
        message: 'User not found'
      }, 404);
    }

    // User profiles
    const profiles = await db
      .prepare(`
        SELECT
          p.id,
          p.name,
          p.img,
          COUNT(DISTINCT wh.video_id) as videos_watched,
          SUM(wh.completion_percentage * v.duration / 100) as watch_time_seconds
        FROM profiles p
        LEFT JOIN watch_history wh ON p.id = wh.profile_id
        LEFT JOIN videos v ON wh.video_id = v.id
        WHERE p.user_id = ?
        GROUP BY p.id
      `)
      .bind(userId)
      .all();

    // Watch history
    const watchHistory = await db
      .prepare(`
        SELECT
          v.id,
          v.title,
          wh.completion_percentage as watch_progress,
          wh.last_watched
        FROM watch_history wh
        JOIN videos v ON wh.video_id = v.id
        WHERE wh.user_id = ?
        ORDER BY wh.last_watched DESC
        LIMIT 20
      `)
      .bind(userId)
      .all();

    // Favorite categories
    const favoriteCategories = await db
      .prepare(`
        SELECT
          v.category,
          COUNT(*) as view_count
        FROM watch_history wh
        JOIN videos v ON wh.video_id = v.id
        WHERE wh.user_id = ?
        GROUP BY v.category
        ORDER BY view_count DESC
        LIMIT 5
      `)
      .bind(userId)
      .all();

    // Engagement metrics
    const engagement = await db
      .prepare(`
        SELECT
          COUNT(*) as comments_count,
          SUM(likes) as total_comment_likes
        FROM comments
        WHERE user_id = ?
      `)
      .bind(userId)
      .first();

    return c.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          phoneNumber: user.phone_number,
          displayName: user.display_name,
          oauthProvider: user.oauth_provider,
          createdAt: user.created_at
        },
        profiles: (profiles.results || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          img: p.img,
          videosWatched: Number(p.videos_watched) || 0,
          watchTime: Number(p.watch_time_seconds) || 0
        })),
        watchHistory: (watchHistory.results || []).map((w: any) => ({
          videoId: w.id,
          videoTitle: w.title,
          watchProgress: Number(w.watch_progress),
          lastWatched: w.last_watched
        })),
        favoriteCategories: (favoriteCategories.results || []).map((c: any) => ({
          category: c.category,
          viewCount: Number(c.view_count)
        })),
        engagementMetrics: {
          commentsCount: Number(engagement?.comments_count) || 0,
          totalCommentLikes: Number(engagement?.total_comment_likes) || 0
        }
      }
    });
  } catch (error) {
    console.error('User profile error:', error);
    return c.json({
      status: 'fail',
      message: 'Failed to fetch user profile'
    }, 500);
  }
});

// Manage featured content
admin.post('/featured', requireAdmin, async (c) => {
  const adminId = c.get('adminId');
  const db = c.env.DB;
  const { videoId, sectionKey, displayOrder } = await c.req.json();

  try {
    // Verify video exists
    const video = await db
      .prepare('SELECT id FROM videos WHERE id = ?')
      .bind(videoId)
      .first();

    if (!video) {
      return c.json({
        status: 'fail',
        message: 'Video not found'
      }, 404);
    }

    // Add to featured content
    await db
      .prepare(`
        INSERT OR REPLACE INTO featured_content
        (video_id, section_key, display_order, is_active, created_by)
        VALUES (?, ?, ?, 1, ?)
      `)
      .bind(videoId, sectionKey, displayOrder || 0, adminId)
      .run();

    // Clear cache
    await c.env.CACHE.delete('browse:KH');

    return c.json({
      status: 'success',
      message: 'Featured content updated'
    });
  } catch (error) {
    console.error('Featured content error:', error);
    return c.json({
      status: 'fail',
      message: 'Failed to update featured content'
    }, 500);
  }
});

// Create admin user (super_admin only)
admin.post('/users', requireAdmin, async (c) => {
  const adminRole = c.get('adminRole');
  const adminId = c.get('adminId');
  const db = c.env.DB;

  // Only super_admin can create new admins
  if (adminRole !== 'super_admin') {
    return c.json({
      status: 'fail',
      message: 'Only super admins can create admin accounts'
    }, 403);
  }

  try {
    const { email, password, name, role = 'editor' } = await c.req.json();

    // Validate inputs
    if (!email || !password || !name) {
      return c.json({
        status: 'fail',
        message: 'Email, password, and name are required'
      }, 400);
    }

    // Check if admin already exists
    const existing = await db
      .prepare('SELECT id FROM admins WHERE email = ?')
      .bind(email)
      .first();

    if (existing) {
      return c.json({
        status: 'fail',
        message: 'Admin with this email already exists'
      }, 400);
    }

    // Hash password and create admin
    const passwordHash = await hashPassword(password);
    const newAdminId = generateId();

    await db
      .prepare('INSERT INTO admins (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)')
      .bind(newAdminId, email, passwordHash, name, role)
      .run();

    // Log activity
    await db
      .prepare('INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)')
      .bind(adminId, 'create_admin', 'admin', newAdminId, JSON.stringify({ email, name, role }))
      .run();

    return c.json({
      status: 'success',
      data: {
        id: newAdminId,
        email,
        name,
        role
      }
    }, 201);
  } catch (error) {
    console.error('Create admin error:', error);
    return c.json({
      status: 'fail',
      message: 'Failed to create admin'
    }, 500);
  }
});

// Serve files from R2 storage
admin.get('/files/:fileKey{.+}', async (c) => {
  const fileKey = c.req.param('fileKey');

  try {
    // Get file from R2
    const object = await c.env.VIDEO_BUCKET.get(fileKey);

    if (!object) {
      return c.json({
        status: 'fail',
        message: 'File not found'
      }, 404);
    }

    // Get file metadata
    const headers = new Headers();

    // Set content type if available
    if (object.httpMetadata?.contentType) {
      headers.set('Content-Type', object.httpMetadata.contentType);
    }

    // Set cache headers for video files
    if (fileKey.includes('videos/')) {
      headers.set('Cache-Control', 'public, max-age=31536000'); // 1 year
    }

    // Set content length if available
    if (object.size) {
      headers.set('Content-Length', object.size.toString());
    }

    // Support range requests for video streaming
    const range = c.req.header('Range');
    if (range && object.size) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : object.size - 1;

      headers.set('Content-Range', `bytes ${start}-${end}/${object.size}`);
      headers.set('Accept-Ranges', 'bytes');

      return new Response(object.body, {
        status: 206, // Partial Content
        headers
      });
    }

    return new Response(object.body, {
      headers
    });

  } catch (error) {
    console.error('File serving error:', error);
    return c.json({
      status: 'error',
      message: 'Failed to serve file'
    }, 500);
  }
});

// ===== R2 DIAGNOSTIC ENDPOINTS (Temporary - Remove after validation) =====

// List objects in R2 bucket
admin.get('/r2/list', requireAdmin, async (c) => {
  try {
    const prefix = c.req.query('prefix') || '';
    const limit = parseInt(c.req.query('limit') || '100');

    const listed = await c.env.VIDEO_BUCKET.list({
      prefix,
      limit
    });

    const objects = listed.objects.map(obj => ({
      key: obj.key,
      size: obj.size,
      uploaded: obj.uploaded,
      httpMetadata: obj.httpMetadata
    }));

    return c.json({
      status: 'success',
      data: {
        objects,
        truncated: listed.truncated,
        cursor: listed.cursor,
        total: objects.length
      }
    });
  } catch (error) {
    console.error('R2 list error:', error);
    return c.json({
      status: 'error',
      message: 'Failed to list R2 objects',
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Test if specific R2 object exists
admin.get('/r2/test/:key', requireAdmin, async (c) => {
  try {
    const key = c.req.param('key');

    // HEAD request to check existence
    const object = await c.env.VIDEO_BUCKET.head(key);

    if (!object) {
      return c.json({
        status: 'fail',
        message: 'Object not found',
        key
      }, 404);
    }

    return c.json({
      status: 'success',
      data: {
        key,
        exists: true,
        size: object.size,
        uploaded: object.uploaded,
        httpMetadata: object.httpMetadata,
        etag: object.etag,
        checksums: object.checksums
      }
    });
  } catch (error) {
    console.error('R2 test error:', error);
    return c.json({
      status: 'error',
      message: 'Failed to test R2 object',
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Get upload statistics
admin.get('/r2/stats', requireAdmin, async (c) => {
  try {
    // List all objects to get stats
    const [videos, thumbnails] = await Promise.all([
      c.env.VIDEO_BUCKET.list({ prefix: 'videos/', limit: 1000 }),
      c.env.VIDEO_BUCKET.list({ prefix: 'thumbnails/', limit: 1000 })
    ]);

    const videoStats = {
      count: videos.objects.length,
      totalSize: videos.objects.reduce((sum, obj) => sum + obj.size, 0),
      keys: videos.objects.map(obj => obj.key)
    };

    const thumbnailStats = {
      count: thumbnails.objects.length,
      totalSize: thumbnails.objects.reduce((sum, obj) => sum + obj.size, 0),
      keys: thumbnails.objects.map(obj => obj.key)
    };

    return c.json({
      status: 'success',
      data: {
        videos: videoStats,
        thumbnails: thumbnailStats,
        total: {
          objects: videoStats.count + thumbnailStats.count,
          size: videoStats.totalSize + thumbnailStats.totalSize
        }
      }
    });
  } catch (error) {
    console.error('R2 stats error:', error);
    return c.json({
      status: 'error',
      message: 'Failed to get R2 statistics',
      error: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// ===== USER MANAGEMENT ENDPOINTS (CLIENT USERS, NOT ADMINS) =====

// Get all client users with business metrics
admin.get('/users', requireAdmin, async (c) => {
  const db = c.env.DB;
  const {
    page = '1',
    limit = '20',
    search = '',
    provider = 'all',
    dateFrom = null,
    dateTo = null,
    engagement = 'all',
    churnRisk = 'all',
    accountStatus = 'all',
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = c.req.query();

  try {
    // Build WHERE clauses
    const whereClauses = [];
    const params: any[] = [];

    // Search filter
    if (search) {
      whereClauses.push('(u.email LIKE ? OR u.phone_number LIKE ? OR u.display_name LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Provider filter
    if (provider !== 'all') {
      if (provider === 'email') {
        whereClauses.push('u.email IS NOT NULL AND u.oauth_provider IS NULL');
      } else if (provider === 'phone') {
        whereClauses.push('u.phone_number IS NOT NULL AND u.oauth_provider IS NULL');
      } else {
        whereClauses.push('u.oauth_provider = ?');
        params.push(provider);
      }
    }

    // Date range filter
    if (dateFrom) {
      whereClauses.push('DATE(u.created_at) >= ?');
      params.push(dateFrom);
    }
    if (dateTo) {
      whereClauses.push('DATE(u.created_at) <= ?');
      params.push(dateTo);
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Main query with computed metrics
    // NOTE: Simplified query - only uses tables that exist in production (users, profiles, watchlist)
    // TODO: Add watch_history and videos JOINs once those tables are deployed to production
    const usersQuery = `
      SELECT
        u.id,
        u.email,
        u.phone_number,
        u.display_name,
        u.oauth_provider,
        u.avatar_url,
        u.created_at,

        -- Metrics from existing tables only
        COUNT(DISTINCT p.id) as profiles_count,
        COUNT(DISTINCT wl.id) as watchlist_count,

        -- Set zeros for video metrics (until watch_history table exists)
        0 as videos_watched,
        0.0 as total_watch_hours,
        0 as comments_count,
        NULL as last_active,

        -- Simplified engagement score (profiles + watchlist only)
        -- Full formula will be restored once watch_history table is deployed
        CAST(ROUND(
          LEAST(100, (
            (CAST(COUNT(DISTINCT p.id) AS REAL) / 5.0) * 60 +
            (CAST(COUNT(DISTINCT wl.id) AS REAL) / 20.0) * 40
          ))
        , 0) AS INTEGER) as engagement_score,

        -- Default churn risk to high (no watch history available yet)
        'high' as churn_risk,

        CASE
          WHEN u.display_name IS NULL OR u.avatar_url IS NULL THEN 1
          WHEN COUNT(DISTINCT p.id) = 0 THEN 1
          ELSE 0
        END as has_issues,

        CAST(JULIANDAY('now') - JULIANDAY(u.created_at) AS INTEGER) as days_since_signup

      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      LEFT JOIN watchlist wl ON p.id = wl.profile_id

      ${whereSQL}

      GROUP BY u.id
    `;

    // Execute with pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedQuery = `${usersQuery} ORDER BY ${sortBy === 'created_at' ? 'u.created_at' : sortBy} ${sortOrder.toUpperCase()} LIMIT ? OFFSET ?`;

    params.push(parseInt(limit), offset);

    const usersResult = await db.prepare(paginatedQuery).bind(...params).all();

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      ${whereSQL}
    `;
    const countParams = params.slice(0, -2); // Remove limit and offset
    const countResult = await db.prepare(countQuery).bind(...countParams).first();

    // Calculate summary stats
    const summaryQuery = `
      SELECT
        COUNT(*) as total_users,
        SUM(CASE WHEN engagement_score >= 61 THEN 1 ELSE 0 END) as power_users,
        SUM(CASE WHEN engagement_score BETWEEN 31 AND 60 THEN 1 ELSE 0 END) as regular_users,
        SUM(CASE WHEN engagement_score <= 30 THEN 1 ELSE 0 END) as casual_users,
        SUM(CASE WHEN churn_risk = 'high' THEN 1 ELSE 0 END) as inactive_users,
        SUM(has_issues) as users_with_issues
      FROM (${usersQuery})
    `;
    const summaryParams = params.slice(0, -2); // Remove limit and offset
    const summary = await db.prepare(summaryQuery).bind(...summaryParams).first();

    // Transform results to camelCase and add segment
    const users = (usersResult.results || []).map((user: any) => {
      let segment = 'new';
      if (user.engagement_score >= 61 && user.churn_risk === 'low') segment = 'power_user';
      else if (user.engagement_score >= 31 && user.engagement_score <= 60) segment = 'regular';
      else if (user.engagement_score > 0 && user.engagement_score < 31) segment = 'casual';
      else if (user.churn_risk === 'high') segment = 'inactive';

      return {
        id: user.id,
        email: user.email,
        phoneNumber: user.phone_number,
        displayName: user.display_name,
        oauthProvider: user.oauth_provider,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
        profilesCount: user.profiles_count,
        videosWatched: user.videos_watched,
        totalWatchHours: user.total_watch_hours,
        commentsCount: user.comments_count,
        watchlistCount: user.watchlist_count,
        lastActive: user.last_active,
        engagementScore: user.engagement_score,
        churnRisk: user.churn_risk,
        hasIssues: user.has_issues === 1,
        daysSinceSignup: user.days_since_signup,
        segment
      };
    });

    return c.json({
      status: 'success',
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult?.total || 0,
          pages: Math.ceil((countResult?.total || 0) / parseInt(limit))
        },
        summary: {
          totalUsers: summary?.total_users || 0,
          powerUsers: summary?.power_users || 0,
          regularUsers: summary?.regular_users || 0,
          casualUsers: summary?.casual_users || 0,
          inactiveUsers: summary?.inactive_users || 0,
          usersWithIssues: summary?.users_with_issues || 0
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    return c.json({
      status: 'fail',
      message: 'Failed to fetch users'
    }, 500);
  }
});

// Get detailed user information
admin.get('/users/:userId', requireAdmin, async (c) => {
  const userId = c.req.param('userId');
  const db = c.env.DB;

  try {
    // User basic info
    const user = await db
      .prepare('SELECT id, email, phone_number, display_name, oauth_provider, avatar_url, created_at FROM users WHERE id = ?')
      .bind(userId)
      .first();

    if (!user) {
      return c.json({
        status: 'fail',
        message: 'User not found'
      }, 404);
    }

    // User profiles with stats
    const profiles = await db
      .prepare(`
        SELECT
          p.id,
          p.name,
          p.img,
          COUNT(DISTINCT wh.video_id) as videos_watched,
          COALESCE(ROUND(SUM(wh.completion_percentage * v.duration / 100 / 3600.0), 2), 0) as watch_time
        FROM profiles p
        LEFT JOIN watch_history wh ON p.id = wh.profile_id
        LEFT JOIN videos v ON wh.video_id = v.id
        WHERE p.user_id = ?
        GROUP BY p.id
        ORDER BY p.profile_index
      `)
      .bind(userId)
      .all();

    // Recent watch history
    const recentActivity = await db
      .prepare(`
        SELECT
          v.id as video_id,
          v.title,
          v.thumbnail_url,
          wh.completion_percentage as watch_progress,
          wh.last_watched
        FROM watch_history wh
        JOIN videos v ON wh.video_id = v.id
        WHERE wh.user_id = ?
        ORDER BY wh.last_watched DESC
        LIMIT 20
      `)
      .bind(userId)
      .all();

    // Favorite categories
    const favoriteCategories = await db
      .prepare(`
        SELECT
          v.category,
          COUNT(*) as view_count,
          ROUND(COUNT(*) * 100.0 / NULLIF((SELECT COUNT(*) FROM watch_history WHERE user_id = ?), 0), 1) as percentage
        FROM watch_history wh
        JOIN videos v ON wh.video_id = v.id
        WHERE wh.user_id = ?
        GROUP BY v.category
        ORDER BY view_count DESC
        LIMIT 5
      `)
      .bind(userId, userId)
      .all();

    // Engagement stats
    const stats = await db
      .prepare(`
        SELECT
          COUNT(DISTINCT wh.video_id) as videos_watched,
          COALESCE(ROUND(SUM(wh.completion_percentage * v.duration / 100), 0), 0) as total_watch_time_seconds,
          COALESCE(ROUND(SUM(wh.completion_percentage * v.duration / 100 / 3600.0), 2), 0) as total_watch_time_hours,
          COALESCE(ROUND(AVG(wh.completion_percentage * v.duration / 100 / 60.0), 0), 0) as avg_session_duration,
          COUNT(DISTINCT c.id) as comments_count,
          COUNT(DISTINCT wl.id) as watchlist_count,
          CAST(ROUND(
            LEAST(100, (
              (COALESCE(SUM(wh.completion_percentage * v.duration / 100 / 3600.0), 0) / 10) * 30 +
              (CAST(COUNT(DISTINCT wh.video_id) AS REAL) / 50.0) * 25 +
              (CAST(COUNT(DISTINCT c.id) AS REAL) / 10.0) * 20 +
              (CAST(COUNT(DISTINCT p.id) AS REAL) / 5.0) * 15 +
              (CAST(COUNT(DISTINCT wl.id) AS REAL) / 20.0) * 10
            ))
          , 0) AS INTEGER) as engagement_score
        FROM users u
        LEFT JOIN watch_history wh ON u.id = wh.user_id
        LEFT JOIN videos v ON wh.video_id = v.id
        LEFT JOIN comments c ON u.id = c.user_id
        LEFT JOIN profiles p ON u.id = p.user_id
        LEFT JOIN watchlist wl ON p.id = wl.profile_id
        WHERE u.id = ?
        GROUP BY u.id
      `)
      .bind(userId)
      .first();

    return c.json({
      status: 'success',
      data: {
        user: {
          id: user.id,
          email: user.email,
          phoneNumber: user.phone_number,
          displayName: user.display_name,
          oauthProvider: user.oauth_provider,
          avatarUrl: user.avatar_url,
          createdAt: user.created_at
        },
        profiles: (profiles.results || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          img: p.img,
          videosWatched: p.videos_watched,
          watchTime: p.watch_time
        })),
        recentActivity: (recentActivity.results || []).map((a: any) => ({
          videoId: a.video_id,
          videoTitle: a.title,
          thumbnailUrl: a.thumbnail_url,
          watchProgress: a.watch_progress,
          lastWatched: a.last_watched
        })),
        favoriteCategories: (favoriteCategories.results || []).map((c: any) => ({
          category: c.category,
          viewCount: c.view_count,
          percentage: c.percentage
        })),
        stats: {
          videosWatched: stats?.videos_watched || 0,
          totalWatchTime: stats?.total_watch_time_seconds || 0,
          totalWatchTimeHours: stats?.total_watch_time_hours || 0,
          avgSessionDuration: stats?.avg_session_duration || 0,
          commentsCount: stats?.comments_count || 0,
          watchlistCount: stats?.watchlist_count || 0,
          engagementScore: stats?.engagement_score || 0
        }
      }
    });
  } catch (error) {
    console.error('Get user details error:', error);
    return c.json({
      status: 'fail',
      message: 'Failed to fetch user details'
    }, 500);
  }
});

// Get user statistics overview
admin.get('/users/stats/overview', requireAdmin, async (c) => {
  const db = c.env.DB;

  try {
    // Total users and new users
    const userCounts = await db
      .prepare(`
        SELECT
          COUNT(*) as total_users,
          SUM(CASE WHEN DATE(created_at) = DATE('now') THEN 1 ELSE 0 END) as new_users_today,
          SUM(CASE WHEN DATE(created_at) >= DATE('now', 'start of month') THEN 1 ELSE 0 END) as new_users_this_month
        FROM users
      `)
      .first();

    // Active users (7 and 30 days)
    const activeUsers = await db
      .prepare(`
        SELECT
          COUNT(DISTINCT CASE WHEN JULIANDAY('now') - JULIANDAY(last_watched) <= 7 THEN user_id END) as active_users_7d,
          COUNT(DISTINCT CASE WHEN JULIANDAY('now') - JULIANDAY(last_watched) <= 30 THEN user_id END) as active_users_30d
        FROM watch_history
      `)
      .first();

    // Average session duration and total watch time
    const watchStats = await db
      .prepare(`
        SELECT
          COALESCE(ROUND(AVG(wh.completion_percentage * v.duration / 100 / 60.0), 0), 0) as avg_session_duration,
          COALESCE(ROUND(SUM(wh.completion_percentage * v.duration / 100 / 3600.0), 0), 0) as total_watch_time_hours
        FROM watch_history wh
        JOIN videos v ON wh.video_id = v.id
      `)
      .first();

    // Registration methods breakdown
    const registrationMethods = await db
      .prepare(`
        SELECT
          CASE
            WHEN oauth_provider IS NOT NULL THEN oauth_provider
            WHEN email IS NOT NULL THEN 'email'
            WHEN phone_number IS NOT NULL THEN 'phone'
            ELSE 'unknown'
          END as method,
          COUNT(*) as count
        FROM users
        GROUP BY method
      `)
      .all();

    const totalForPercentage = Number(userCounts?.total_users) || 1;
    const methodsWithPercentage = (registrationMethods.results || []).map((m: any) => ({
      method: m.method,
      count: Number(m.count),
      percentage: Math.round((Number(m.count) / totalForPercentage) * 100)
    }));

    // Growth trend (last 30 days)
    const growthTrend = await db
      .prepare(`
        SELECT
          DATE(created_at) as date,
          COUNT(*) as new_users
        FROM users
        WHERE DATE(created_at) >= DATE('now', '-30 days')
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `)
      .all();

    // Calculate cumulative
    let cumulative = await db
      .prepare("SELECT COUNT(*) as count FROM users WHERE DATE(created_at) < DATE('now', '-30 days')")
      .first();

    let runningTotal = Number(cumulative?.count) || 0;
    const growthWithCumulative = (growthTrend.results || []).map((day: any) => {
      runningTotal += Number(day.new_users);
      return {
        date: day.date,
        newUsers: Number(day.new_users),
        cumulativeUsers: runningTotal
      };
    });

    return c.json({
      status: 'success',
      data: {
        overview: {
          totalUsers: Number(userCounts?.total_users) || 0,
          activeUsers7d: Number(activeUsers?.active_users_7d) || 0,
          activeUsers30d: Number(activeUsers?.active_users_30d) || 0,
          newUsersToday: Number(userCounts?.new_users_today) || 0,
          newUsersThisMonth: Number(userCounts?.new_users_this_month) || 0,
          avgSessionDuration: Number(watchStats?.avg_session_duration) || 0,
          totalWatchTimeHours: Number(watchStats?.total_watch_time_hours) || 0
        },
        registrationMethods: methodsWithPercentage,
        growthTrend: growthWithCumulative
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    return c.json({
      status: 'fail',
      message: 'Failed to fetch user statistics'
    }, 500);
  }
});

export default admin;