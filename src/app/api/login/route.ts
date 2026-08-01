import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, getAuthCookieOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  if (verifyPassword(password)) {
    const { name, value, options } = getAuthCookieOptions();
    const response = NextResponse.json({ success: true });
    response.cookies.set(name, value, options);
    return response;
  }

  return NextResponse.json({ error: '密码错误' }, { status: 401 });
}
