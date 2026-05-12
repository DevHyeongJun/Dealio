// 기본 계정을 idempotent 하게 보장한다. (없을 때만 생성, 있으면 그대로 둠)
// Docker 런타임 이미지에서도 동작하도록 self-contained CJS 로 작성한다 (tsx, src/ 의존 X).
const { PrismaClient } = require('@prisma/client');
const { randomBytes, scrypt: _scrypt } = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(_scrypt);
const SCRYPT_KEYLEN = 64;

async function hashPassword(plain) {
  const salt = randomBytes(16);
  const derived = await scrypt(plain, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

const DEFAULT_USERS = [
  { username: 'admin', name: '관리자', password: 'admin1234', role: 'ADMIN' },
  { username: 'staff', name: '담당자', password: 'staff1234', role: 'USER' },
];

async function main() {
  const prisma = new PrismaClient();
  try {
    let created = 0;
    let kept = 0;
    for (const u of DEFAULT_USERS) {
      const existing = await prisma.user.findUnique({ where: { username: u.username } });
      if (existing) {
        kept++;
        continue;
      }
      await prisma.user.create({
        data: {
          username: u.username,
          name: u.name,
          role: u.role,
          isActive: true,
          passwordHash: await hashPassword(u.password),
        },
      });
      created++;
      console.log(`  + 기본 계정 생성: ${u.username} / ${u.password} (${u.role})`);
    }
    console.log(`✓ 기본 계정 확인: 신규 ${created}건, 기존 ${kept}건`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
