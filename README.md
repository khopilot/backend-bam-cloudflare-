# Bam-flix Cambodia - Cloudflare Workers Backend

Modern, edge-deployed backend for Bam-flix Cambodia streaming platform using Cloudflare Workers.

## Features

- ⚡ **Zero cold starts** - Instant response times globally
- 🌍 **Edge deployment** - Runs in 300+ cities worldwide
- 🔐 **Secure authentication** - Web Crypto API with PBKDF2
- 💾 **D1 Database** - Serverless SQLite at the edge
- 🚀 **KV Storage** - Fast session and cache management
- 🎬 **TMDB Integration** - Real-time movie/TV data
- 💰 **Cost-effective** - Pay only for requests, no idle costs

## Tech Stack

- **Runtime**: Cloudflare Workers (V8 Isolates)
- **Framework**: Hono (Ultra-fast web framework)
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Cloudflare KV
- **Language**: TypeScript
- **Auth**: JWT + Web Crypto API

## Quick Start

### Prerequisites

- Node.js 18+
- Cloudflare account
- Wrangler CLI (`npm install -g wrangler`)

### Installation

```bash
# Clone the repository
git clone https://github.com/khopilot/bamflix-cambodia.git
cd bamflix-cambodia/server-cf

# Install dependencies
npm install

# Login to Cloudflare
wrangler login
```

### Setup Database

```bash
# Create D1 database
wrangler d1 create bamflix-db

# Note the database_id and update wrangler.toml

# Initialize schema
wrangler d1 execute bamflix-db --file=./schema.sql --local
```

### Setup KV Namespaces

```bash
# Create KV namespaces
wrangler kv:namespace create SESSIONS
wrangler kv:namespace create CACHE

# Update the IDs in wrangler.toml
```

### Configure Environment

Update `wrangler.toml`:
```toml
[vars]
JWT_SECRET = "your-secret-key"
TMDB_AUTH = "your-tmdb-bearer-token"
TMDB_URL = "https://api.themoviedb.org/3"
```

Or use secrets for production:
```bash
wrangler secret put JWT_SECRET
wrangler secret put TMDB_AUTH
```

### Development

```bash
# Start local dev server
npm run dev

# Visit http://localhost:8787
```

### Deployment

```bash
# Deploy to Cloudflare
npm run deploy

# Your API will be available at:
# https://bamflix-workers.YOUR-SUBDOMAIN.workers.dev
```

## API Endpoints

### Authentication
- `POST /api/v1/bamflix/users/signup` - User registration
- `POST /api/v1/bamflix/users/login` - User login
- `POST /api/v1/bamflix/users/logout` - User logout
- `GET /api/v1/bamflix/users/auth` - Get authenticated user

### User Management
- `GET /api/v1/bamflix/users` - List all users
- `GET /api/v1/bamflix/users/:id` - Get user by ID
- `PATCH /api/v1/bamflix/users/:id` - Update user
- `DELETE /api/v1/bamflix/users/:id` - Delete user

### Profiles
- `GET /api/v1/bamflix/users/:id/subProfiles` - Get user profiles
- `POST /api/v1/bamflix/users/:id/subProfiles` - Create profile
- `PATCH /api/v1/bamflix/users/:id/subProfiles/:subId` - Update profile
- `DELETE /api/v1/bamflix/users/:id/subProfiles/:subId` - Delete profile

### Watchlist
- `GET /api/v1/bamflix/users/:id/subProfiles/:subId/watchlist` - Get watchlist
- `POST /api/v1/bamflix/users/:id/subProfiles/:subId/watchlist` - Add to watchlist

### Content
- `POST /api/v1/bamflix/browse` - Browse all content
- `POST /api/v1/bamflix/browse/genre/tv_shows` - TV shows
- `POST /api/v1/bamflix/browse/genre/movies` - Movies
- `POST /api/v1/bamflix/browse/kids` - Kids content

## Project Structure

```
server-cf/
├── src/
│   ├── index.ts           # Main application entry
│   ├── types.ts           # TypeScript definitions
│   ├── routes/
│   │   ├── auth.ts        # Authentication routes
│   │   ├── users.ts       # User management
│   │   ├── profiles.ts    # Profile management
│   │   └── movies.ts      # TMDB integration
│   ├── middleware/
│   │   └── auth.ts        # Auth middleware
│   ├── utils/
│   │   └── auth.ts        # Auth utilities
│   └── data/
│       └── countries.json # Country data
├── schema.sql             # D1 database schema
├── wrangler.toml         # Cloudflare config
├── package.json
└── tsconfig.json
```

## Database Schema

```sql
-- Users table
users (id, email, password_hash, created_at)

-- Profiles table (normalized from MongoDB embedded array)
profiles (id, user_id, profile_index, name, img, is_profile)

-- Watchlist table (normalized from nested array)
watchlist (id, profile_id, movie_id, title, poster_path, backdrop_path, media_type)

-- Profile icons
profile_icons (id, name, img, category)
```

## Security

- Passwords hashed using Web Crypto API (PBKDF2, 100k iterations)
- JWT tokens for session management
- HTTP-only secure cookies
- CORS configured for production domains

## Performance

- **Response time**: <50ms globally (edge deployment)
- **Cache strategy**: 1-hour TTL for TMDB data
- **Database**: D1 provides <10ms query times
- **KV Storage**: <10ms read latency for sessions

## Monitoring

View metrics in Cloudflare Dashboard:
- Request count and response times
- Error rates and status codes
- D1 query performance
- KV operations
- Geographic distribution

## Troubleshooting

### Database not found
```bash
# Ensure D1 database is created and ID is in wrangler.toml
wrangler d1 list
```

### Authentication fails
```bash
# Verify JWT_SECRET is set
wrangler secret list
```

### TMDB API errors
```bash
# Check TMDB_AUTH token is valid
curl -H "Authorization: Bearer YOUR_TOKEN" https://api.themoviedb.org/3/movie/550
```

## Migration from Express

See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for detailed migration instructions from the Express/MongoDB backend.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Support

For issues and questions:
- GitHub Issues: [github.com/khopilot/bamflix-cambodia/issues](https://github.com/khopilot/bamflix-cambodia/issues)
- Email: support@bamflix.kh

## Acknowledgments

- TMDB for movie/TV data API
- Cloudflare for edge infrastructure
- Hono framework for ultra-fast routing