import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { invalidateIpRuleCache, validateCidr } from '@/lib/ipFilter';

const ruleSchema = z.object({
  cidr: z.string().min(1, 'CIDR 또는 IP 를 입력하세요').max(64),
  label: z.string().max(100).optional().nullable(),
  enabled: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  const items = await prisma.accessRule.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  const body = await req.json().catch(() => ({}));
  const parsed = ruleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const v = validateCidr(parsed.data.cidr);
  if (!v.ok) {
    return NextResponse.json({ error: 'INVALID_CIDR', message: v.error }, { status: 400 });
  }

  const created = await prisma.accessRule.create({
    data: {
      cidr: parsed.data.cidr.trim(),
      label: parsed.data.label?.trim() || null,
      enabled: parsed.data.enabled,
    },
  });
  invalidateIpRuleCache();
  return NextResponse.json(created, { status: 201 });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
