# Bam-flix Backend Migration Guide: Express → Cloudflare Workers

## Overview

This guide documents the migration from Express/Node.js with MongoDB to Cloudflare Workers with D1 (SQLite).

## Architecture Changes

### Before (Express/Node.js)
```
Client → Vercel (Express) → MongoDB Atlas
         ↓
         JWT + bcrypt auth
         ↓
         TMDB API
```

### After (Cloudflare Workers)
```
Client → Cloudflare Workers → D1 Database (SQLite)
         ↓                     KV Storage (Sessions/Cache)
         Web Crypto API auth
         ↓
         TMDB API
```

## Key Technology Changes

| Component | Express Stack | Workers Stack |
|-----------|--------------|---------------|
| Runtime | Node.js | Cloudflare Workers (V8) |
| Framework | Express | Hono |
| Database | MongoDB (Mongoose) | D1 (SQLite) |
| Password Hashing | bcrypt | Web Crypto API (PBKDF2) |
| Sessions | Cookies | KV Storage + Cookies |
| File Structure | CommonJS | ES Modules |
| Environment Vars | .env files | wrangler.toml + Dashboard |

## Database Migration

### MongoDB Schema → SQL Tables

#### Users Collection → users table
```sql
-- MongoDB embedded subProfile array is normalized
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Embedded subProfile → profiles table
```sql
CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  profile_index INTEGER NOT NULL,
  name TEXT NOT NULL,
  img TEXT NOT NULL,
  is_profile BOOLEAN DEFAULT 1,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### Nested watchList → watchlist table
```sql
CREATE TABLE watchlist (
  id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  movie_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  poster_path TEXT,
  backdrop_path TEXT,
  media_type TEXT,
  FOREIGN KEY (profile_id) REFERENCES profiles(id)
);
```

## Authentication Migration

### bcrypt → Web Crypto API

Old (bcrypt):
```javascript
const bcrypt = require('bcrypt');
const salt = await bcrypt.genSalt();
const hash = await bcrypt.hash(password, salt);
```

New (Web Crypto):
```typescript
// PBKDF2 with 100,000 iterations
const salt = crypto.getRandomValues(new Uint8Array(16));
const hashBuffer = await crypto.subtle.deriveBits({
  name: 'PBKDF2',
  salt,
  iterations: 100000,
  hash: 'SHA-256'
}, keyMaterial, 256);
```

## API Compatibility

All endpoints remain the same to ensure frontend compatibility:

- `POST /api/v1/bamflix/users/signup`
- `POST /api/v1/bamflix/users/login`
- `POST /api/v1/bamflix/users/logout`
- `GET /api/v1/bamflix/users/auth`
- `GET /api/v1/bamflix/users/:id`
- `PATCH /api/v1/bamflix/users/:id`
- `DELETE /api/v1/bamflix/users/:id`
- `GET /api/v1/bamflix/users/:id/subProfiles`
- `POST /api/v1/bamflix/users/:id/subProfiles`
- `PATCH /api/v1/bamflix/users/:id/subProfiles/:subId`
- `DELETE /api/v1/bamflix/users/:id/subProfiles/:subId`
- `GET /api/v1/bamflix/users/:id/subProfiles/:subId/watchlist`
- `POST /api/v1/bamflix/users/:id/subProfiles/:subId/watchlist`
- `GET /api/v1/bamflix/users/profileIcons`
- `POST /api/v1/bamflix/browse`
- `POST /api/v1/bamflix/browse/genre/tv_shows`
- `POST /api/v1/bamflix/browse/genre/movies`
- `POST /api/v1/bamflix/browse/kids`
- `POST /api/v1/bamflix/browse/kids/tv`
- `POST /api/v1/bamflix/browse/kids/movies`

## Data Migration Steps

1. **Export MongoDB Data**
```bash
mongoexport --uri="mongodb+srv://..." --collection=users --out=users.json
```

2. **Transform Data Structure**
```javascript
// Transform script (pseudo-code)
users.forEach(user => {
  // Insert into users table
  db.insert('users', {
    id: user._id,
    email: user.email,
    password_hash: user.password // Already hashed
  });

  // Flatten subProfiles
  user.subProfile.forEach(profile => {
    db.insert('profiles', {
      user_id: user._id,
      profile_index: profile.id,
      name: profile.name,
      img: profile.img,
      is_profile: profile.isProfile
    });

    // Flatten watchList
    profile.watchList?.forEach(item => {
      db.insert('watchlist', {
        profile_id: profile.id,
        movie_id: item.id,
        title: item.title,
        // ... other fields
      });
    });
  });
});
```

3. **Import to D1**
```bash
wrangler d1 execute bamflix-db --file=import.sql
```

## Deployment Steps

### 1. Install Dependencies
```bash
cd server-cf
npm install
```

### 2. Create Cloudflare Resources
```bash
# Create D1 database
wrangler d1 create bamflix-db

# Create KV namespaces
wrangler kv:namespace create SESSIONS
wrangler kv:namespace create CACHE
```

### 3. Update wrangler.toml
Replace the placeholder IDs with actual IDs from step 2:
```toml
[[d1_databases]]
binding = "DB"
database_name = "bamflix-db"
database_id = "YOUR_ACTUAL_DATABASE_ID"

[[kv_namespaces]]
binding = "SESSIONS"
id = "YOUR_ACTUAL_KV_ID"
```

### 4. Initialize Database Schema
```bash
wrangler d1 execute bamflix-db --file=./schema.sql --local # Test locally
wrangler d1 execute bamflix-db --file=./schema.sql # Production
```

### 5. Set Environment Variables
Via Cloudflare Dashboard or CLI:
```bash
wrangler secret put JWT_SECRET
wrangler secret put TMDB_AUTH
```

### 6. Deploy
```bash
# Development
wrangler dev

# Production
wrangler deploy
```

## Testing Migration

### Local Testing
```bash
# Start local development
wrangler dev

# Test endpoints
curl http://localhost:8787/api/v1/bamflix/health
```

### Verify Data Integrity
1. Test user signup/login
2. Verify profile creation
3. Check watchlist functionality
4. Confirm TMDB API integration

## Rollback Plan

If issues arise:
1. Keep Express backend running in parallel initially
2. Use feature flags to switch between backends
3. Maintain MongoDB data as source of truth until confident

## Performance Benefits

- **Zero cold starts**: Instant global response
- **Edge caching**: KV storage for sessions and TMDB cache
- **Global distribution**: Automatic via Cloudflare network
- **Cost reduction**: Pay-per-request vs always-on server

## Monitoring

- Cloudflare Analytics Dashboard
- Workers Metrics
- D1 Query Performance
- KV Operations

## Migration Timeline

1. **Phase 1** (Day 1-2): Setup infrastructure
2. **Phase 2** (Day 3-4): Migrate authentication
3. **Phase 3** (Day 5-6): Port all endpoints
4. **Phase 4** (Day 7): Data migration
5. **Phase 5** (Day 8-9): Testing
6. **Phase 6** (Day 10): Production deployment

## Support & Troubleshooting

Common issues and solutions:

### CORS Issues
Ensure Hono CORS middleware matches Express configuration:
```typescript
app.use('*', cors({
  origin: '*',
  credentials: true
}));
```

### Password Verification Fails
Old bcrypt hashes won't work with Web Crypto. Options:
1. Force password reset for all users
2. Maintain dual auth system temporarily
3. Migrate passwords on next login

### Database Connection
D1 is embedded, no connection string needed. Access via:
```typescript
const db = c.env.DB;
```

## Next Steps

1. Review and update frontend API endpoints if needed
2. Set up CI/CD with GitHub Actions
3. Configure custom domain
4. Enable Cloudflare Web Analytics