import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, publicUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({ user: publicUser(user) });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
