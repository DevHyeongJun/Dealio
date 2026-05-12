import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireUser, requireAdmin } from '@/lib/auth';
import { companySchema } from '@/lib/user';

export async function GET(req: NextRequest) {
  const guard = await requireUser(req);
  if (guard instanceof NextResponse) return guard;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  const activeOnly = searchParams.get('activeOnly') === 'true';

  const where: Prisma.CompanyWhereInput = {};
  if (q) where.name = { contains: q, mode: 'insensitive' };
  if (activeOnly) where.isActive = true;

  const items = await prisma.company.findMany({
    where,
    orderBy: { name: 'asc' },
    include: { _count: { select: { users: true } } },
  });

  return NextResponse.json({ items, total: items.length });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  const body = await req.json();
  const parsed = companySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const created = await prisma.company.create({
    data: {
      name: parsed.data.name.trim(),
      memo: parsed.data.memo ?? null,
      isActive: parsed.data.isActive,
    },
    include: { _count: { select: { users: true } } },
  });

  return NextResponse.json(created, { status: 201 });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
