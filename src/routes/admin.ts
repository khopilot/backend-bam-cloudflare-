import { Hono } from 'hono';
import { validator } from 'hono/validator';
import { getCookie, setCookie } from 'hono/cookie';
import type { Env } from '../types';
import { hashPassword, verifyPassword, createToken, generateId, verifyToken } from '../utils/auth';
import { transformVideoForAPI, transformVideoForDB, transformToSnakeCase } from '../utils/transform';

const admin = new Hono<{ Bindings: Env }>();

// Admin authentication middleware
async function requireAdmin(c: any, next: any) {
  const token = getCookie(c, 'admin_jwt');

  if (!token) {
    return c.json({
      status: 'fail',
      message: 'Admin authentication required'
    }, 401);
  }

  const payload = await verifyToken(token, c.env.JWT_SECRET);

  if (!payload || !payload.isAdmin) {
    return c.json({
      status: 'fail',
      message: 'Invalid admin credentials'
    }, 401);
  }

  // Verify admin still exists and is active
  const admin = await c.env.DB
    .prepare('SELECT id, email, role, is_active FROM admins WHERE id = ?')
    .bind(payload.id)
    .first();

  if (!admin || !admin.is_active) {
    return c.json({
      status: 'fail',
      message: 'Admin account not found or inactive'
    }, 401);
  }

  c.set('adminId', payload.id);
  c.set('adminEmail', payload.email);
  c.set('adminRole', admin.role);

  await next();
}

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
      .prepare('SELECT id, title, video_url, thumbnail_url FROM videos WHERE id = ?')
      .bind(videoId)
      .first();

    if (!video) {
      return c.json({
        status: 'fail',
        message: 'Video not found'
      }, 404);
    }

    if (!video.video_url || !video.thumbnail_url) {
      return c.json({
        status: 'fail',
        message: 'Video must have video URL and thumbnail before publishing'
      }, 400);
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
  const { filename, contentType, fileSize } = await c.req.json();
  const adminId = c.get('adminId');

  // Validate file
  const maxSize = 5 * 1024 * 1024 * 1024; // 5GB max
  if (fileSize > maxSize) {
    return c.json({
      status: 'fail',
      message: 'File size exceeds 5GB limit'
    }, 400);
  }

  // Generate unique key for R2
  const timestamp = Date.now();
  const r2Key = `videos/${timestamp}-${filename}`;

  // TODO: Generate presigned URL for R2 upload
  // This would require R2 bucket configuration

  return c.json({
    status: 'success',
    data: {
      r2Key,
      uploadUrl: 'https://r2-upload-url-placeholder.com', // Placeholder
      message: 'R2 upload configuration needed'
    }
  });
});

// Handle video upload with metadata
admin.post('/videos/upload', requireAdmin, async (c) => {
  const adminId = c.get('adminId');
  const db = c.env.DB;

  try {
    // Handle multipart/form-data from frontend
    const formData = await c.req.formData();

    console.log('Upload form data received');

    // Extract form fields
    const formFields: any = {};
    const files: any = {};

    for (const [key, value] of formData.entries()) {
      if (key === 'video' || key === 'thumbnail') {
        files[key] = value;
        console.log(`File received: ${key}, type: ${value.type}, size: ${value.size}`);
      } else {
        formFields[key] = value.toString();
      }
    }

    console.log('Extracted form fields:', JSON.stringify(formFields, null, 2));
    console.log('Files received:', Object.keys(files));

    // Parse tags if it's a JSON string
    if (formFields.tags && typeof formFields.tags === 'string') {
      try {
        formFields.tags = JSON.parse(formFields.tags);
      } catch (e) {
        // If not JSON, split by comma
        formFields.tags = formFields.tags.split(',').map((t: string) => t.trim());
      }
    }

    // Transform camelCase data to snake_case for database
    const videoData = transformToSnakeCase(formFields);

    console.log('Transformed to snake_case:', JSON.stringify(videoData, null, 2));

    // Set defaults
    videoData.language = videoData.language || 'km';
    videoData.age_rating = videoData.age_rating || 'all';
    videoData.status = videoData.status || 'draft';

    // Validate required fields
    if (!videoData.title || !videoData.category) {
      console.error('Validation failed - missing required fields:', {
        title: videoData.title,
        category: videoData.category,
        allFields: videoData
      });
      return c.json({
        status: 'fail',
        message: `Title and category are required. Received: title=${videoData.title}, category=${videoData.category}`
      }, 400);
    }

    // Generate video ID
    const videoId = generateId();

    // Mock file processing - in real implementation, you would:
    // 1. Process uploaded video file
    // 2. Generate thumbnail
    // 3. Upload to R2 storage
    // 4. Extract video metadata (duration, resolution, etc.)

    const mockVideoUrl = `https://r2-bucket.com/videos/${videoId}.mp4`;
    const mockThumbnailUrl = `https://r2-bucket.com/thumbnails/${videoId}.jpg`;

    // Prepare database record
    const dbRecord = {
      id: videoId,
      title: videoData.title,
      title_km: videoData.title_km || null,
      description: videoData.description || null,
      description_km: videoData.description_km || null,
      thumbnail_url: mockThumbnailUrl,
      video_url: mockVideoUrl,
      category: videoData.category,
      subcategory: videoData.subcategory || null,
      section: videoData.section || null,
      language: videoData.language,
      age_rating: videoData.age_rating,
      badge: videoData.badge || null,
      tags: videoData.tags ? JSON.stringify(Array.isArray(videoData.tags) ? videoData.tags : videoData.tags.split(',').map((t: string) => t.trim())) : null,
      status: videoData.status,
      uploaded_by: adminId,
      scheduled_at: videoData.scheduled_at || null
      // Note: created_at and updated_at are handled by database defaults
    };

    // Insert video record
    console.log('Attempting database insert with:', JSON.stringify(dbRecord, null, 2));

    try {
      const result = await db
        .prepare(`
          INSERT INTO videos (
            id, title, title_km, description, description_km,
            thumbnail_url, video_url, category, subcategory, section,
            language, age_rating, badge, tags, status, uploaded_by,
            scheduled_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          dbRecord.id, dbRecord.title, dbRecord.title_km, dbRecord.description, dbRecord.description_km,
          dbRecord.thumbnail_url, dbRecord.video_url, dbRecord.category, dbRecord.subcategory, dbRecord.section,
          dbRecord.language, dbRecord.age_rating, dbRecord.badge, dbRecord.tags, dbRecord.status, dbRecord.uploaded_by,
          dbRecord.scheduled_at
        )
        .run();

      console.log('Database insert successful:', result);
    } catch (dbError: any) {
      console.error('Database insert failed:', dbError);
      console.error('Error details:', dbError.message);
      console.error('Error stack:', dbError.stack);
      throw new Error(`Database insert failed: ${dbError.message}`);
    }

    // Log admin activity
    await db
      .prepare('INSERT INTO admin_logs (admin_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)')
      .bind(adminId, 'video_upload', 'video', videoId, JSON.stringify({ title: dbRecord.title, category: dbRecord.category, status: dbRecord.status }))
      .run();

    // Return response with camelCase data
    const responseData = transformVideoForAPI(dbRecord);

    return c.json({
      status: 'success',
      message: 'Video uploaded successfully (mock implementation)',
      data: {
        ...responseData,
        note: 'This is a mock implementation. Real file upload and R2 storage integration needed.'
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

// Get analytics dashboard
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

export default admin;