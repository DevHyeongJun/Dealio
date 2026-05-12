import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  getSessionUser,
  hashPassword,
  publicUser,
  requireAdmin,
} from '@/lib/auth';
import { userUpdateSchema } from '@/lib/user';

const companyBrief = { select: { id: true, name: true, isActive: true } };

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: { company: companyBrief },
  });
  if (!user) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  return NextResponse.json({ ...publicUser(user), company: (user as any).company ?? null });
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  const body = await req.json().catch(() => ({}));
  const parsed = userUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data: Prisma.UserUpdateInput = {};
  if (parsed.data.username !== undefined) data.username = parsed.data.username;
  if (parsed.data.email !== undefined) data.email = parsed.data.email ?? null;
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.role !== undefined) data.role = parsed.data.role;
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;
  if (parsed.data.password) data.passwordHash = await hashPassword(parsed.data.password);
  if (parsed.data.companyId !== undefined) {
    if (parsed.data.companyId) {
      const exists = await prisma.company.findUnique({ where: { id: parsed.data.companyId } });
      if (!exists) return NextResponse.json({ error: '회사를 찾을 수 없습니다.' }, { status: 400 });
      data.company = { connect: { id: parsed.data.companyId } };
    } else {
      data.company = { disconnect: true };
    }
  }
  if (parsed.data.jobTitle !== undefined) data.jobTitle = parsed.data.jobTitle ?? null;
  if (parsed.data.phone !== undefined) data.phone = parsed.data.phone ?? null;

  // 자기 자신을 비활성/USER로 강등하는 것은 락아웃 위험이 있어 차단
  if (guard.user.id === params.id) {
    if (parsed.data.isActive === false) {
      return NextResponse.json({ error: 'CANNOT_DEACTIVATE_SELF' }, { status: 400 });
    }
    if (parsed.data.role === 'USER') {
      return NextResponse.json({ error: 'CANNOT_DEMOTE_SELF' }, { status: 400 });
    }
  }

  try {
    const updated = await prisma.user.update({
      where: { id: params.id },
      data,
      include: { company: companyBrief },
    });
    return NextResponse.json({ ...publicUser(updated), company: (updated as any).company ?? null });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') return NextResponse.json({ error: 'USERNAME_TAKEN' }, { status: 409 });
      if (e.code === 'P2025') return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    throw e;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  if (guard.user.id === params.id) {
    return NextResponse.json({ error: 'CANNOT_DELETE_SELF' }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }
    throw e;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
