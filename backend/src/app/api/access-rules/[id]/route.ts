import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { invalidateIpRuleCache, validateCidr } from '@/lib/ipFilter';

const updateSchema = z.object({
  cidr: z.string().min(1).max(64).optional(),
  label: z.string().max(100).optional().nullable(),
  enabled: z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  const body = await req.json().catch(() => ({}));
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data: { cidr?: string; label?: string | null; enabled?: boolean } = {};
  if (parsed.data.cidr !== undefined) {
    const v = validateCidr(parsed.data.cidr);
    if (!v.ok) return NextResponse.json({ error: 'INVALID_CIDR', message: v.error }, { status: 400 });
    data.cidr = parsed.data.cidr.trim();
  }
  if (parsed.data.label !== undefined) data.label = parsed.data.label?.trim() || null;
  if (parsed.data.enabled !== undefined) data.enabled = parsed.data.enabled;

  try {
    const updated = await prisma.accessRule.update({ where: { id: params.id }, data });
    invalidateIpRuleCache();
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireAdmin(req);
  if (guard instanceof NextResponse) return guard;

  try {
    await prisma.accessRule.delete({ where: { id: params.id } });
    invalidateIpRuleCache();
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
