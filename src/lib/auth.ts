import { cookies } from 'next/headers';
import crypto from 'crypto';

const TOKEN_NAME = 'auth_token';
const PASSWORD = process.env.ADMIN_PASSWORD || 'photography2026';
const SECRET = process.env.SESSION_SECRET || 'fallback-secret';

function createToken(password: string): string {
  return crypto
    .createHmac('sha256', SECRET)
    .update(`${password}:${SECRET}`)
    .digest('hex');
}

export function verifyPassword(password: string): boolean {
  return password === PASSWORD;
}

export async function setAuthCookie(): Promise<void> {
  const token = createToken(PASSWORD);
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60,
    path: '/',
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(TOKEN_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;
  if (!token) return false;
  const expected = createToken(PASSWORD);
  return token === expected;
}
