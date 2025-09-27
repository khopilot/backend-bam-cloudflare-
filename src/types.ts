export interface Env {
  // D1 Database
  DB: D1Database;

  // KV Namespaces
  SESSIONS: KVNamespace;
  CACHE: KVNamespace;

  // Environment variables
  JWT_SECRET: string;
  TMDB_AUTH: string;
  TMDB_URL: string;
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  profile_index: number;
  name: string;
  img: string;
  is_profile: boolean;
  created_at: string;
}

export interface WatchlistItem {
  id: string;
  profile_id: string;
  movie_id: number;
  title: string;
  poster_path?: string;
  backdrop_path?: string;
  media_type: 'movie' | 'tv';
  added_at: string;
}

export interface ProfileIcon {
  id: string;
  name: string;
  img: string;
  category?: string;
}

export interface JWTPayload {
  id: string;
  email: string;
  exp: number;
}