import { sign, verify } from 'hono/jwt';
import type { Env, JWTPayload } from '../types';

// Password hashing using Web Crypto API
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derive key using PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    data,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  // Convert to base64
  const hashArray = new Uint8Array(hashBuffer);
  const saltArray = new Uint8Array(salt);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(saltArray);
  combined.set(hashArray, salt.length);

  return btoa(String.fromCharCode(...combined));
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);

    // Decode the stored hash
    const combined = Uint8Array.from(atob(hash), c => c.charCodeAt(0));
    const salt = combined.slice(0, 16);
    const storedHash = combined.slice(16);

    // Derive key using same parameters
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      data,
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    const hashArray = new Uint8Array(hashBuffer);

    // Compare hashes
    return hashArray.every((byte, i) => byte === storedHash[i]);
  } catch {
    return false;
  }
}

// JWT token creation
export async function createToken(userId: string, email: string, secret: string, additionalClaims?: any): Promise<string> {
  const payload: JWTPayload = {
    id: userId,
    email,
    exp: Math.floor(Date.now() / 1000) + (3 * 24 * 60 * 60), // 3 days
    ...additionalClaims // Allow additional claims like isAdmin, role, etc.
  };

  return await sign(payload, secret);
}

// JWT token verification
export async function verifyToken(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const payload = await verify(token, secret) as JWTPayload;

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

// Generate random ID
export function generateId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}