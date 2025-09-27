import { Hono } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { validator } from 'hono/validator';
import type { Env, User } from '../types';
import { hashPassword, verifyPassword, createToken, generateId } from '../utils/auth';

const auth = new Hono<{ Bindings: Env }>();

// Validation schemas
const signupSchema = validator('json', (value, c) => {
  const email = value['email'];
  const password = value['password'];

  if (!email || typeof email !== 'string') {
    return c.json({ status: 'fail', message: 'Please enter a valid email' }, 400);
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return c.json({ status: 'fail', message: 'Please enter a valid email' }, 400);
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    return c.json({ status: 'fail', message: 'Minimum password length is 6 characters' }, 400);
  }

  return { email: email.toLowerCase().trim(), password };
});

const loginSchema = validator('json', (value, c) => {
  const email = value['email'];
  const password = value['password'];

  if (!email || !password) {
    return c.json({ status: 'fail', message: 'Email and password are required' }, 400);
  }

  return { email: email.toLowerCase().trim(), password };
});

// Sign up endpoint
auth.post('/signup', signupSchema, async (c) => {
  const { email, password } = c.req.valid('json');
  const db = c.env.DB;

  try {
    // Check if user already exists
    const existingUser = await db
      .prepare('SELECT id FROM users WHERE email = ?')
      .bind(email)
      .first();

    if (existingUser) {
      return c.json({ status: 'fail', message: 'This account is already registered' }, 400);
    }

    // Hash password
    const passwordHash = await hashPassword(password);
    const userId = generateId();

    // Create user
    await db
      .prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)')
      .bind(userId, email, passwordHash)
      .run();

    // Create default profiles
    const defaultProfiles = [
      {
        user_id: userId,
        profile_index: 0,
        name: 'Add Profile',
        img: '/images/addProfile.svg',
        is_profile: false
      },
      {
        user_id: userId,
        profile_index: 1,
        name: 'kids',
        img: 'https://dl.dropboxusercontent.com/scl/fi/k2lrec356rb6ecrjlh46c/kids.png?rlkey=t0wwdggp85hj0g562vc6u4apz&dl=0',
        is_profile: true
      }
    ];

    for (const profile of defaultProfiles) {
      await db
        .prepare(
          'INSERT INTO profiles (user_id, profile_index, name, img, is_profile) VALUES (?, ?, ?, ?, ?)'
        )
        .bind(
          profile.user_id,
          profile.profile_index,
          profile.name,
          profile.img,
          profile.is_profile ? 1 : 0
        )
        .run();
    }

    // Create JWT token
    const token = await createToken(userId, email, c.env.JWT_SECRET);

    // Set cookie
    setCookie(c, 'jwt', token, {
      httpOnly: true,
      maxAge: 3 * 24 * 60 * 60, // 3 days
      sameSite: 'None',
      secure: true
    });

    return c.json({
      status: 'success',
      data: userId
    }, 201);
  } catch (error) {
    console.error('Signup error:', error);
    return c.json({ status: 'fail', message: 'Failed to create account' }, 500);
  }
});

// Login endpoint
auth.post('/login', loginSchema, async (c) => {
  const { email, password } = c.req.valid('json');
  const db = c.env.DB;

  try {
    // Find user
    const user = await db
      .prepare('SELECT id, email, password_hash FROM users WHERE email = ?')
      .bind(email)
      .first<User>();

    if (!user) {
      return c.json({ status: 'fail', message: 'This account does not exist' }, 404);
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return c.json({ status: 'fail', message: 'Incorrect password' }, 401);
    }

    // Create JWT token
    const token = await createToken(user.id, user.email, c.env.JWT_SECRET);

    // Set cookie
    setCookie(c, 'jwt', token, {
      httpOnly: true,
      maxAge: 3 * 24 * 60 * 60, // 3 days
      sameSite: 'None',
      secure: true
    });

    return c.json({
      status: 'success',
      data: user.id
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ status: 'fail', message: 'Login failed' }, 500);
  }
});

// Logout endpoint
auth.post('/logout', (c) => {
  // Clear the JWT cookie
  setCookie(c, 'jwt', '', {
    httpOnly: true,
    maxAge: 1,
    sameSite: 'None',
    secure: true
  });

  return c.json({
    status: 'success',
    message: 'logged out'
  });
});

export default auth;