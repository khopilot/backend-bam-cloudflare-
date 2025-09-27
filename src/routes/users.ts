import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth';
import type { Env, User, Profile } from '../types';

const users = new Hono<{ Bindings: Env }>();

// Get all users (admin endpoint - you may want to protect this)
users.get('/', async (c) => {
  const db = c.env.DB;

  try {
    const result = await db
      .prepare('SELECT id, email, created_at FROM users')
      .all<User>();

    return c.json({
      status: 'success',
      result: result.results.length,
      data: result.results
    });
  } catch (error) {
    return c.json({
      status: 'fail',
      message: 'Failed to fetch users'
    }, 404);
  }
});

// Get authenticated user
users.get('/auth', requireAuth, async (c) => {
  const userId = c.get('userId');
  const db = c.env.DB;

  try {
    const user = await db
      .prepare('SELECT id, email, created_at FROM users WHERE id = ?')
      .bind(userId)
      .first<User>();

    if (!user) {
      return c.json({
        status: 'fail',
        message: 'User not found'
      }, 404);
    }

    // Get user's profiles
    const profiles = await db
      .prepare('SELECT * FROM profiles WHERE user_id = ? ORDER BY profile_index')
      .bind(userId)
      .all<Profile>();

    // Format response to match original structure
    const userData = {
      _id: user.id,
      email: user.email,
      subProfile: profiles.results.map(profile => ({
        id: profile.profile_index,
        name: profile.name,
        img: profile.img,
        isProfile: profile.is_profile,
        watchList: [] // Will be populated separately if needed
      })),
      createdAt: user.created_at
    };

    return c.json({
      status: 'success',
      data: userData
    });
  } catch (error) {
    return c.json({
      status: 'fail',
      message: 'Failed to fetch user'
    }, 404);
  }
});

// Get specific user by ID
users.get('/:id', async (c) => {
  const userId = c.req.param('id');
  const db = c.env.DB;

  try {
    const user = await db
      .prepare('SELECT id, email, created_at FROM users WHERE id = ?')
      .bind(userId)
      .first<User>();

    if (!user) {
      return c.json({
        status: 'fail',
        message: 'User not found'
      }, 404);
    }

    // Get user's profiles
    const profiles = await db
      .prepare('SELECT * FROM profiles WHERE user_id = ? ORDER BY profile_index')
      .bind(userId)
      .all<Profile>();

    // Format response to match original structure
    const userData = {
      _id: user.id,
      email: user.email,
      subProfile: profiles.results.map(profile => ({
        id: profile.profile_index,
        name: profile.name,
        img: profile.img,
        isProfile: profile.is_profile,
        watchList: []
      })),
      createdAt: user.created_at
    };

    return c.json({
      status: 'success',
      data: userData
    });
  } catch (error) {
    return c.json({
      status: 'fail',
      message: 'Failed to fetch user'
    }, 404);
  }
});

// Update user
users.patch('/:id', async (c) => {
  const userId = c.req.param('id');
  const body = await c.req.json();
  const db = c.env.DB;

  try {
    // For now, only allow email updates
    if (body.email) {
      await db
        .prepare('UPDATE users SET email = ? WHERE id = ?')
        .bind(body.email, userId)
        .run();
    }

    // If subProfile is being updated, handle it separately
    if (body.subProfile) {
      // This would require more complex logic to sync profiles
      // For now, return success
    }

    return c.json({
      status: 'success',
      data: { id: userId }
    });
  } catch (error) {
    return c.json({
      status: 'fail',
      message: 'Failed to update user'
    }, 400);
  }
});

// Delete user
users.delete('/:id', async (c) => {
  const userId = c.req.param('id');
  const db = c.env.DB;

  try {
    // Delete user (cascades to profiles and watchlist due to foreign keys)
    await db
      .prepare('DELETE FROM users WHERE id = ?')
      .bind(userId)
      .run();

    return c.json({
      status: 'success'
    }, 204);
  } catch (error) {
    return c.json({
      status: 'fail',
      message: 'Failed to delete user'
    }, 400);
  }
});

export default users;