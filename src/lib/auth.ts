import { cookies } from 'next/headers';
import { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';
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

/** 返回用于设置认证 cookie 的配置对象 */
export function getAuthCookieOptions(): { name: string; value: string; options: Partial<ResponseCookie> } {
  return {
    name: TOKEN_NAME,
    value: createToken(PASSWORD),
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',  // 'lax' 比 'strict' 兼容性更好
      maxAge: 24 * 60 * 60,
      path: '/',
    },
  };
}

/** 返回用于清除认证 cookie 的配置对象 */
export function getClearCookieOptions(): { name: string; value: string; options: Partial<ResponseCookie> } {
  return {
    name: TOKEN_NAME,
    value: '',
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    },
  };
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;
  if (!token) return false;
  const expected = createToken(PASSWORD);
  return token === expected;
}
