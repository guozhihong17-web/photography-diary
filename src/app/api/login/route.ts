import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, setAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  if (verifyPassword(password)) {
    await setAuthCookie();
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: '密码错误' }, { status: 401 });
}
