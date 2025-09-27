/**
 * Utility functions for transforming data between snake_case (DB) and camelCase (API)
 */

/**
 * Convert snake_case string to camelCase
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}

/**
 * Convert camelCase string to snake_case
 */
export function toSnakeCase(str: string): string {
  // Handle the transition from lowercase to uppercase
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase();
}

/**
 * Transform object keys from snake_case to camelCase recursively
 */
export function transformToCamelCase(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => transformToCamelCase(item));
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const transformed: any = {};

    for (const [key, value] of Object.entries(obj)) {
      const camelKey = toCamelCase(key);
      transformed[camelKey] = transformToCamelCase(value);
    }

    return transformed;
  }

  return obj;
}

/**
 * Transform object keys from camelCase to snake_case recursively
 */
export function transformToSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => transformToSnakeCase(item));
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const transformed: any = {};

    for (const [key, value] of Object.entries(obj)) {
      const snakeKey = toSnakeCase(key);
      transformed[snakeKey] = transformToSnakeCase(value);
    }

    return transformed;
  }

  return obj;
}

/**
 * Transform database video record to API format
 */
export function transformVideoForAPI(dbVideo: any) {
  if (!dbVideo) return null;

  const video = transformToCamelCase(dbVideo);

  // Parse JSON fields if they're strings
  if (typeof video.tags === 'string') {
    try {
      video.tags = JSON.parse(video.tags);
    } catch {
      video.tags = [];
    }
  }

  if (typeof video.subtitles === 'string') {
    try {
      video.subtitles = JSON.parse(video.subtitles);
    } catch {
      video.subtitles = [];
    }
  }

  // Ensure numeric fields are numbers
  video.views = Number(video.views) || 0;
  video.likes = Number(video.likes) || 0;
  video.shares = Number(video.shares) || 0;
  video.commentsCount = Number(video.commentsCount) || 0;
  video.duration = video.duration ? Number(video.duration) : undefined;
  video.fileSize = video.fileSize ? Number(video.fileSize) : undefined;
  video.featuredOrder = video.featuredOrder ? Number(video.featuredOrder) : undefined;

  // Convert boolean fields
  video.featured = Boolean(video.featured);

  return video;
}

/**
 * Transform API video data for database insertion
 */
export function transformVideoForDB(apiVideo: any) {
  if (!apiVideo) return null;

  // Convert to snake_case
  const video = transformToSnakeCase(apiVideo);

  // Stringify JSON fields
  if (video.tags && Array.isArray(video.tags)) {
    video.tags = JSON.stringify(video.tags);
  }

  if (video.subtitles && Array.isArray(video.subtitles)) {
    video.subtitles = JSON.stringify(video.subtitles);
  }

  // Convert boolean to integer for SQLite
  if (video.featured !== undefined) {
    video.featured = video.featured ? 1 : 0;
  }

  return video;
}