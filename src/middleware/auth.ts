import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import { verifyToken } from '../utils/auth';
import type { Env } from '../types';

export async function requireAuth(c: Context<{ Bindings: Env }>, next: Next) {
  const token = getCookie(c, 'jwt');

  if (!token) {
    return c.json({
      status: 'fail',
      data: false
    }, 400);
  }

  const payload = await verifyToken(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json({
      status: 'fail',
      data: false
    }, 400);
  }

  // Add user ID to context for use in routes
  c.set('userId', payload.id);
  c.set('userEmail', payload.email);

  await next();
}

export async function headerAuth(c: Context<{ Bindings: Env }>, next: Next) {
  try {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({
        status: 'fail',
        message: 'API Authorization failed'
      }, 401);
    }

    const token = authHeader.split(' ')[1];
    const payload = await verifyToken(token, c.env.JWT_SECRET);

    if (!payload) {
      return c.json({
        status: 'fail',
        message: 'Invalid API authorization key'
      }, 401);
    }

    await next();
  } catch (error) {
    return c.json({
      status: 'fail',
      message: 'API Authorization failed'
    }, 401);
  }
}