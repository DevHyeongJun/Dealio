import { PrismaClient, QuotationStatus, ProductCategory, Currency } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();

const SEED_USERS = [
  {
    username: 'admin',
    name: '관리자',
    password: 'admin1234',
    role: 'ADMIN' as const,
  },
  {
    username: 'staff',
    name: '담당자',
    password: 'staff1234',
    role: 'USER' as const,
  },
];

const PRODUCTS: Array<{
  code: string;
  name: string;
  category: ProductCategory;
  unit: string;
  currency: Currency;
  unitPrice: number;
  description: string;
}> = [
  { code: 'WEB-001', name: '웹사이트 기본형 패키지',     category: 'DEVELOPMENT', unit: '식', currency: 'KRW', unitPrice: 3_000_000,  description: '랜딩 페이지 + 5개 서브 페이지 제작' },
  { code: 'WEB-002', name: '웹사이트 프리미엄 패키지',   category: 'DEVELOPMENT', unit: '식', currency: 'KRW', unitPrice: 8_000_000,  description: 'CMS 포함, 반응형, SEO 최적화' },
  { code: 'APP-001', name: '모바일 앱 개발 (iOS+AOS)',   category: 'DEVELOPMENT', unit: '식', currency: 'KRW', unitPrice: 15_000_000, description: '하이브리드 앱, 백엔드 연동 포함' },
  { code: 'DSN-001', name: '브랜드 로고 디자인',         category: 'DESIGN',      unit: '건', currency: 'KRW', unitPrice: 800_000,    description: '시안 3종 + 가이드라인 제작' },
  { code: 'DSN-002', name: 'UI/UX 디자인 (페이지당)',    category: 'DESIGN',      unit: 'P',  currency: 'USD', unitPrice: 350,        description: '와이어프레임 + 시안 2종' },
  { code: 'MNT-001', name: '월간 유지보수 (Basic)',      category: 'MAINTENANCE', unit: 'M',  currency: 'KRW', unitPrice: 500_000,    description: '월 8시간 한도, 영업일 응답' },
  { code: 'MNT-002', name: '월간 유지보수 (Pro)',        category: 'MAINTENANCE', unit: 'M',  currency: 'KRW', unitPrice: 1_200_000,  description: '월 24시간 한도, 우선순위 대응' },
  { code: 'CON-001', name: 'IT 컨설팅',                   category: 'DEVELOPMENT', unit: 'H',  currency: 'KRW', unitPrice: 150_000,    description: '시간당 컨설팅 (최소 4시간)' },
  { code: 'HST-001', name: '클라우드 호스팅',             category: 'MAINTENANCE', unit: 'M',  currency: 'KRW', unitPrice: 200_000,    description: 'AWS/GCP 매니지드 호스팅 (월간)' },
];

interface SeedQuotation {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  status: QuotationStatus;
  daysFromNow: number;
  validDays: number;
  notes?: string;
  itemCodes: { code: string; quantity: number }[];
}

const QUOTATIONS: SeedQuotation[] = [
  {
    customerName: '(주)테크스타트',
    customerEmail: 'contact@techstart.kr',
    customerPhone: '02-1234-5678',
    customerAddress: '서울 강남구 테헤란로 123',
    status: 'SENT',
    daysFromNow: -5,
    validDays: 30,
    notes: '계약 체결 시 30% 선금 지급 조건.',
    itemCodes: [
      { code: 'WEB-002', quantity: 1 },
      { code: 'MNT-001', quantity: 6 },
    ],
  },
  {
    customerName: '블루마운틴 카페',
    customerEmail: 'owner@bluemountain.co.kr',
    customerPhone: '031-987-6543',
    customerAddress: '경기 성남시 분당구 정자로 45',
    status: 'ACCEPTED',
    daysFromNow: -20,
    validDays: 14,
    notes: '로고 컬러는 블루 계열로 진행.',
    itemCodes: [
      { code: 'DSN-001', quantity: 1 },
      { code: 'WEB-001', quantity: 1 },
    ],
  },
  {
    customerName: '한빛커머스',
    customerEmail: 'po@hanbit-commerce.com',
    customerPhone: '02-555-7777',
    customerAddress: '서울 마포구 월드컵북로 100',
    status: 'DRAFT',
    daysFromNow: 0,
    validDays: 21,
    itemCodes: [
      { code: 'APP-001', quantity: 1 },
      { code: 'MNT-002', quantity: 12 },
      { code: 'HST-001', quantity: 12 },
    ],
  },
  {
    customerName: '두레메디칼',
    customerEmail: 'admin@dure-med.co.kr',
    customerPhone: '02-2222-3333',
    customerAddress: '서울 송파구 올림픽로 240',
    status: 'REJECTED',
    daysFromNow: -45,
    validDays: 14,
    notes: '예산 초과로 보류.',
    itemCodes: [
      { code: 'CON-001', quantity: 16 },
    ],
  },
  {
    customerName: '그린포레스트',
    customerEmail: 'biz@greenforest.kr',
    customerPhone: '055-444-1212',
    customerAddress: '경남 창원시 의창구 중앙대로 88',
    status: 'EXPIRED',
    daysFromNow: -90,
    validDays: 30,
    itemCodes: [
      { code: 'WEB-001', quantity: 1 },
      { code: 'DSN-001', quantity: 1 },
    ],
  },
];

function pad(n: number, len = 2) {
  return String(n).padStart(len, '0');
}

function quotationNumber(date: Date, idx: number) {
  return `Q-${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(idx, 4)}`;
}

async function main() {
  console.log('▸ 기존 시드 데이터 정리...');
  await prisma.quotationHistory.deleteMany({});
  await prisma.quotationSendLog.deleteMany({});
  await prisma.quotationItem.deleteMany({});
  await prisma.quotation.deleteMany({});
  await prisma.product.deleteMany({});

  console.log('▸ 사용자 생성...');
  for (const u of SEED_USERS) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {
        name: u.name,
        role: u.role,
        isActive: true,
        passwordHash: await hashPassword(u.password),
      },
      create: {
        username: u.username,
        name: u.name,
        role: u.role,
        isActive: true,
        passwordHash: await hashPassword(u.password),
      },
    });
  }
  const admin = await prisma.user.findUnique({ where: { username: SEED_USERS[0].username } });
  const staff = await prisma.user.findUnique({ where: { username: SEED_USERS[1].username } });

  console.log('▸ 품목 생성...');
  await prisma.product.createMany({ data: PRODUCTS });
  const products = await prisma.product.findMany();
  const byCode = new Map(products.map((p) => [p.code, p]));

  console.log('▸ 견적서 생성...');
  let counter = 1;
  for (const q of QUOTATIONS) {
    const issueDate = new Date();
    issueDate.setDate(issueDate.getDate() + q.daysFromNow);
    const validUntil = new Date(issueDate);
    validUntil.setDate(validUntil.getDate() + q.validDays);

    const items = q.itemCodes.map((it, idx) => {
      const product = byCode.get(it.code);
      if (!product) throw new Error(`Unknown product code: ${it.code}`);
      const unitPrice = Number(product.unitPrice);
      return {
        productId: product.id,
        name: product.name,
        description: product.description,
        quantity: it.quantity,
        unitPrice,
        amount: Math.round(it.quantity * unitPrice * 100) / 100,
        sortOrder: idx,
      };
    });
    const totalAmount = items.reduce((s, i) => s + i.amount, 0);

    const owner = counter % 2 === 0 ? staff : admin;
    const created = await prisma.quotation.create({
      data: {
        quotationNumber: quotationNumber(issueDate, counter++),
        customerName: q.customerName,
        customerEmail: q.customerEmail,
        customerPhone: q.customerPhone,
        customerAddress: q.customerAddress,
        issueDate,
        validUntil,
        status: q.status,
        notes: q.notes ?? null,
        totalAmount,
        createdById: owner?.id,
        updatedById: owner?.id,
        items: { create: items },
      },
    });
    await prisma.quotationHistory.create({
      data: {
        quotationId: created.id,
        userId: owner?.id,
        action: 'CREATE',
        summary: '견적서 생성 (시드)',
      },
    });
  }

  const [userCount, productCount, quotationCount] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.quotation.count(),
  ]);
  console.log(`✓ 시드 완료: 사용자 ${userCount}명, 품목 ${productCount}건, 견적서 ${quotationCount}건`);
  console.log('  로그인: admin / admin1234  (관리자)');
  console.log('         staff / staff1234  (일반)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
