import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser, requireAdmin } from '@/lib/auth';
import { recordAccessLog, clientIp } from '@/lib/accessLog';

const recordSchema = z.object({
  path: z.string().min(1).max(500),
  label: z.string().max(200).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const guard = await requireUser(req);
  if (guard instanceof NextResponse) return guard;

  const body = await req.json().catch(() => ({}));
  const parsed = recordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await recordAccessLog(prisma, {
    userId: guard.user.id,
    path: parsed.data.path,
    label: parsed.data.label ?? null,
    ipAddress: clientIp(req),
    userAgent: req.headers.get('user-agent'),
  });

  return new NextResponse(null, { status: 204 });
}

const listSchema = z.object({
  userId: z.string().optional(),
  q: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  const sp = req.nextUrl.searchParams;
  const parsed = listSchema.safeParse({
    userId: sp.get('userId') || undefined,
    q: sp.get('q') || undefined,
    from: sp.get('from') || undefined,
    to: sp.get('to') || undefined,
    limit: sp.get('limit') || undefined,
    offset: sp.get('offset') || undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { userId, q, from, to, limit, offset } = parsed.data;

  const where: Record<string, unknown> = {};
  if (userId) where.userId = userId;
  if (q) {
    (where as { OR: unknown[] }).OR = [
      { path: { contains: q, mode: 'insensitive' } },
      { label: { contains: q, mode: 'insensitive' } },
    ];
  }
  const createdAt: Record<string, Date> = {};
  if (from) {
    const d = new Date(from);
    if (!Number.isNaN(d.getTime())) createdAt.gte = d;
  }
  if (to) {
    const d = new Date(to);
    if (!Number.isNaN(d.getTime())) createdAt.lte = d;
  }
  if (Object.keys(createdAt).length) where.createdAt = createdAt;

  const [items, total] = await Promise.all([
    prisma.accessLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: { select: { id: true, username: true, name: true, role: true } },
      },
    }),
    prisma.accessLog.count({ where }),
  ]);

  return NextResponse.json({ items, total, limit, offset });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
