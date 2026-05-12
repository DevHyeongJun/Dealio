import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { cleanupOldAccessLogs } from '@/lib/accessLog';

/** 즉시 보존기간 초과 접속 로그 정리. ADMIN 전용. */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  const result = await cleanupOldAccessLogs(prisma);
  return NextResponse.json(result);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
