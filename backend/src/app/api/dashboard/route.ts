import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { buildDashboard } from '@/lib/dashboard';

export async function GET(req: NextRequest) {
  const guard = await requireUser(req);
  if (guard instanceof NextResponse) return guard;

  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get('year');
  const year = yearParam ? Number(yearParam) : new Date().getFullYear();
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: '유효하지 않은 연도' }, { status: 400 });
  }

  try {
    const data = await buildDashboard(year);
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: 'DASHBOARD_FAILED', message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
