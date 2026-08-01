import { NextResponse } from 'next/server';
import { getClearCookieOptions } from '@/lib/auth';

export async function POST() {
  const { name, value, options } = getClearCookieOptions();
  const response = NextResponse.json({ success: true });
  response.cookies.set(name, value, options);
  return response;
}
