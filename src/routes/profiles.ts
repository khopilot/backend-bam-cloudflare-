import { Hono } from 'hono';
import type { Env, Profile, WatchlistItem } from '../types';
import { generateId } from '../utils/auth';

const profiles = new Hono<{ Bindings: Env }>();

// Get all profiles for a user
profiles.get('/:id/subProfiles', async (c) => {
  const userId = c.req.param('id');
  const db = c.env.DB;

  try {
    const result = await db
      .prepare('SELECT * FROM profiles WHERE user_id = ? ORDER BY profile_index')
      .bind(userId)
      .all<Profile>();

    // Filter out "Add Profile" for display when there are more than 5 profiles
    let profileList = result.results.map(profile => ({
      id: profile.profile_index,
      name: profile.name,
      img: profile.img,
      isProfile: profile.is_profile,
      watchList: []
    }));

    if (profileList.length > 5) {
      profileList = profileList.filter(item => item.id !== 0);
    }

    return c.json({
      status: 'success',
      result: profileList.length,
      data: profileList
    });
  } catch (error) {
    return c.json({
      status: 'fail',
      message: 'Failed to fetch profiles'
    }, 404);
  }
});

// Create new profile
profiles.post('/:id/subProfiles', async (c) => {
  const userId = c.req.param('id');
  const body = await c.req.json();
  const db = c.env.DB;

  try {
    // Get current profile count
    const countResult = await db
      .prepare('SELECT MAX(profile_index) as max_index FROM profiles WHERE user_id = ?')
      .bind(userId)
      .first<{ max_index: number }>();

    const newIndex = (countResult?.max_index ?? -1) + 1;
    const profileId = generateId();

    // Create new profile
    await db
      .prepare(
        'INSERT INTO profiles (id, user_id, profile_index, name, img, is_profile) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .bind(profileId, userId, newIndex, body.name, body.img, 1)
      .run();

    return c.json({
      status: 'success',
      data: {
        id: newIndex,
        name: body.name,
        img: body.img,
        isProfile: true,
        watchList: []
      }
    }, 201);
  } catch (error) {
    return c.json({
      status: 'fail',
      message: 'Failed to create profile'
    }, 400);
  }
});

// Update profile
profiles.patch('/:id/subProfiles/:subId', async (c) => {
  const userId = c.req.param('id');
  const subId = parseInt(c.req.param('subId'));
  const body = await c.req.json();
  const db = c.env.DB;

  try {
    // Update profile
    const updates = [];
    const values = [];

    if (body.name) {
      updates.push('name = ?');
      values.push(body.name);
    }
    if (body.img) {
      updates.push('img = ?');
      values.push(body.img);
    }
    if (body.watchList) {
      // Handle watchlist update separately
      // For now, skip this
    }

    if (updates.length > 0) {
      values.push(userId, subId);
      await db
        .prepare(`UPDATE profiles SET ${updates.join(', ')} WHERE user_id = ? AND profile_index = ?`)
        .bind(...values)
        .run();
    }

    return c.json({
      status: 'success',
      data: { id: subId }
    });
  } catch (error) {
    return c.json({
      status: 'fail',
      message: 'Failed to update profile'
    }, 400);
  }
});

// Delete profile
profiles.delete('/:id/subProfiles/:subId', async (c) => {
  const userId = c.req.param('id');
  const subId = parseInt(c.req.param('subId'));
  const db = c.env.DB;

  try {
    // Delete profile
    await db
      .prepare('DELETE FROM profiles WHERE user_id = ? AND profile_index = ?')
      .bind(userId, subId)
      .run();

    // Reindex remaining profiles
    const remaining = await db
      .prepare('SELECT * FROM profiles WHERE user_id = ? ORDER BY profile_index')
      .bind(userId)
      .all<Profile>();

    // Update indices
    for (let i = 0; i < remaining.results.length; i++) {
      const profile = remaining.results[i];
      if (profile.profile_index > 1 && profile.profile_index !== i) {
        await db
          .prepare('UPDATE profiles SET profile_index = ? WHERE id = ?')
          .bind(i, profile.id)
          .run();
      }
    }

    return c.json({
      status: 'success'
    });
  } catch (error) {
    return c.json({
      status: 'fail',
      message: 'Failed to delete profile'
    }, 400);
  }
});

// Get watchlist for a profile
profiles.get('/:id/subProfiles/:subId/watchlist', async (c) => {
  const userId = c.req.param('id');
  const subId = parseInt(c.req.param('subId'));
  const db = c.env.DB;

  try {
    // Get profile
    const profile = await db
      .prepare('SELECT id FROM profiles WHERE user_id = ? AND profile_index = ?')
      .bind(userId, subId)
      .first<Profile>();

    if (!profile) {
      return c.json({
        status: 'fail',
        message: 'Profile not found'
      }, 404);
    }

    // Get watchlist
    const watchlist = await db
      .prepare('SELECT * FROM watchlist WHERE profile_id = ? ORDER BY added_at DESC')
      .bind(profile.id)
      .all<WatchlistItem>();

    return c.json({
      status: 'success',
      data: watchlist.results
    });
  } catch (error) {
    return c.json({
      status: 'fail',
      message: 'Failed to fetch watchlist'
    }, 404);
  }
});

// Add to watchlist
profiles.post('/:id/subProfiles/:subId/watchlist', async (c) => {
  const userId = c.req.param('id');
  const subId = parseInt(c.req.param('subId'));
  const body = await c.req.json();
  const db = c.env.DB;

  try {
    // Get profile
    const profile = await db
      .prepare('SELECT id FROM profiles WHERE user_id = ? AND profile_index = ?')
      .bind(userId, subId)
      .first<Profile>();

    if (!profile) {
      return c.json({
        status: 'fail',
        message: 'Profile not found'
      }, 404);
    }

    // Add to watchlist
    await db
      .prepare(
        'INSERT OR REPLACE INTO watchlist (profile_id, movie_id, title, poster_path, backdrop_path, media_type) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .bind(
        profile.id,
        body.movie_id || body.id,
        body.title || body.name,
        body.poster_path,
        body.backdrop_path,
        body.media_type || 'movie'
      )
      .run();

    return c.json({
      status: 'success',
      data: body
    }, 201);
  } catch (error) {
    return c.json({
      status: 'fail',
      message: 'Failed to add to watchlist'
    }, 400);
  }
});

// Get profile icons
profiles.get('/profileIcons', async (c) => {
  const db = c.env.DB;

  try {
    const icons = await db
      .prepare('SELECT * FROM profile_icons')
      .all();

    return c.json({
      status: 'success',
      result: icons.results.length,
      data: icons.results
    });
  } catch (error) {
    return c.json({
      status: 'fail',
      message: 'Failed to fetch profile icons'
    }, 404);
  }
});

export default profiles;