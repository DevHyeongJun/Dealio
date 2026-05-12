import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { productSchema, generateProductCode } from '@/lib/product';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  const activeOnly = searchParams.get('activeOnly') === 'true';
  const category = searchParams.get('category')?.trim();
  const sort = searchParams.get('sort') ?? 'usage'; // usage | recent
  const take = Math.min(Number(searchParams.get('take') ?? 100), 500);
  const skip = Number(searchParams.get('skip') ?? 0);

  const where: Prisma.ProductWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { code: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (activeOnly) where.isActive = true;
  if (category) where.category = category as Prisma.ProductWhereInput['category'];

  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    sort === 'recent'
      ? [{ createdAt: 'desc' }]
      : [{ usageCount: 'desc' }, { name: 'asc' }];

  const [items, total] = await Promise.all([
    prisma.product.findMany({ where, orderBy, take, skip }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({ items, total });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { code: _ignored, ...rest } = parsed.data;

  // 코드는 항상 서버에서 자동 생성. 동시 생성 시 unique 충돌이 나면 재시도.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = await generateProductCode();
    try {
      const created = await prisma.product.create({ data: { ...rest, code } });
      return NextResponse.json(created, { status: 201 });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        continue;
      }
      throw e;
    }
  }
  return NextResponse.json({ error: '품목코드 자동 생성에 실패했습니다. 잠시 후 다시 시도하세요.' }, { status: 500 });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
