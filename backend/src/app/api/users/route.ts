import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { hashPassword, publicUser, requireAdmin } from '@/lib/auth';
import { userCreateSchema } from '@/lib/user';

const companyBrief = { select: { id: true, name: true, isActive: true } };

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  const { searchParams } = new URL(req.url);
  const companyParam = searchParams.get('companyId');
  const q = searchParams.get('q')?.trim();

  const where: Prisma.UserWhereInput = {};
  if (companyParam === 'none') where.companyId = null;
  else if (companyParam) where.companyId = companyParam;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { username: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { jobTitle: { contains: q, mode: 'insensitive' } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    include: { company: companyBrief },
  });
  return NextResponse.json({ items: users.map((u) => ({ ...publicUser(u), company: (u as any).company ?? null })) });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  const body = await req.json().catch(() => ({}));
  const parsed = userCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // companyId 가 들어왔으면 존재 검증
  if (parsed.data.companyId) {
    const exists = await prisma.company.findUnique({ where: { id: parsed.data.companyId } });
    if (!exists) {
      return NextResponse.json({ error: '회사를 찾을 수 없습니다.' }, { status: 400 });
    }
  }

  try {
    const created = await prisma.user.create({
      data: {
        username: parsed.data.username,
        email: parsed.data.email ?? null,
        name: parsed.data.name,
        role: parsed.data.role,
        isActive: parsed.data.isActive,
        companyId: parsed.data.companyId ?? null,
        jobTitle: parsed.data.jobTitle ?? null,
        phone: parsed.data.phone ?? null,
        passwordHash: await hashPassword(parsed.data.password),
      },
      include: { company: companyBrief },
    });
    return NextResponse.json({ ...publicUser(created), company: (created as any).company ?? null }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ error: 'USERNAME_TAKEN' }, { status: 409 });
    }
    throw e;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
