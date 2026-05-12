import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser, requireAdmin } from '@/lib/auth';
import { companySchema } from '@/lib/user';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireUser(req);
  if (guard instanceof NextResponse) return guard;

  const company = await prisma.company.findUnique({
    where: { id: params.id },
    include: { _count: { select: { users: true } } },
  });
  if (!company) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  return NextResponse.json(company);
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  const body = await req.json();
  const parsed = companySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.company.update({
    where: { id: params.id },
    data: {
      name: parsed.data.name.trim(),
      memo: parsed.data.memo ?? null,
      isActive: parsed.data.isActive,
    },
    include: { _count: { select: { users: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  // 소속 사용자가 있으면 거부 — 먼저 사용자를 다른 회사로 옮기거나 삭제하게 한다.
  const userCount = await prisma.user.count({ where: { companyId: params.id } });
  if (userCount > 0) {
    return NextResponse.json(
      { error: `이 회사에 소속된 사용자가 ${userCount}명 있습니다. 먼저 사용자를 다른 회사로 이동하거나 삭제하세요.` },
      { status: 400 },
    );
  }

  await prisma.company.delete({ where: { id: params.id } });
  return new NextResponse(null, { status: 204 });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
