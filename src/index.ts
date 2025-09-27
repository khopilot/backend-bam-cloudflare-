import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { jwt } from 'hono/jwt';
import type { Env } from './types';

// Route imports
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import profileRoutes from './routes/profiles';
import movieRoutes from './routes/movies';
import videoRoutes from './routes/videos';
import adminRoutes from './routes/admin';

const app = new Hono<{ Bindings: Env }>();

// Allowed origins for CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://client-chi-flame.vercel.app',
  'https://client-jjh7k4dp0-khopilots-projects.vercel.app',
  'https://client-rh2cxem7k-khopilots-projects.vercel.app',
  'https://client-nuxgubbzy-khopilots-projects.vercel.app',
  'https://bam-admin-hyiv93pp0-khopilots-projects.vercel.app',
  'https://bam-admin-7ar1wq6jo-khopilots-projects.vercel.app',
  'https://bam-admin-oq3orj2tj-khopilots-projects.vercel.app'
];

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: (origin, c) => {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return null;

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return origin;
    }

    // Also allow any Vercel preview deployments
    if (origin.includes('.vercel.app')) {
      return origin;
    }

    // Deny other origins
    return null;
  },
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  exposeHeaders: ['set-cookie']
}));

// API version prefix
const api = app.basePath('/api/v1/bamflix');

// Mount routes
api.route('/users', authRoutes);
api.route('/users', userRoutes);
api.route('/users', profileRoutes);
api.route('/', movieRoutes);
api.route('/videos', videoRoutes);
api.route('/admin', adminRoutes);

// Health check
api.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    service: 'bamflix-workers',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({
    status: 'fail',
    message: 'Route not found'
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error(`${err}`);
  return c.json({
    status: 'error',
    message: err.message || 'Internal server error'
  }, 500);
});

export default app;