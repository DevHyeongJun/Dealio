#!/usr/bin/env bash
# 시스템 실행: API(backend) + Postgres 만 Docker 로 띄운다.
# Frontend(Vite) 는 이 스크립트가 띄우지 않는다 — 별도 터미널에서 `cd frontend && npm run dev` 로 직접 실행.
# 사용법: ./start.sh
# backend 는 항상 재빌드한다 (코드/스키마 변경 누락 방지).
set -euo pipefail

cd "$(dirname "$0")"

# 필수 .env 검사 (3개: 루트 / backend / frontend)
# frontend/.env 는 사용자가 직접 `npm run dev` 로 띄울 때 필요 — 미리 점검만 한다.
missing=()
[ -f .env ]          || missing+=("./.env (docker-compose 전용)")
[ -f backend/.env ]  || missing+=("./backend/.env (API 서버)")
[ -f frontend/.env ] || missing+=("./frontend/.env (프론트, dev 모드용)")
if [ "${#missing[@]}" -gt 0 ]; then
  echo "❌ 다음 .env 파일이 없습니다:"
  for f in "${missing[@]}"; do echo "   - $f"; done
  echo "README 의 환경변수 섹션을 참고해 직접 작성한 뒤 다시 실행하세요."
  exit 1
fi

# 업로드 파일 보관소 (사업자등록증 등) — 컨테이너에 볼륨 마운트되므로 호스트 측에 미리 디렉토리가 있어야 함
mkdir -p FILE_STORAGE

echo "[*] Docker: postgres 기동"
docker compose up -d postgres

echo "[*] Docker: backend 재빌드 후 기동"
docker compose up -d --build backend

# backend 헬스 대기 (4000 포트 LISTEN까지)
echo "[*] backend 준비 대기..."
for _ in $(seq 1 60); do
  if curl -sf http://localhost:4000/dealio/api/health >/dev/null 2>&1 \
     || nc -z localhost 4000 >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

# DB 스키마 동기화 (컨테이너 안에서 실행 → DATABASE_URL 그대로 사용)
# - 커밋된 마이그레이션이 있으면 migrate deploy 로 안전 적용
# - 없으면 db push 로 schema.prisma 그대로 동기화 (마이그레이션 미관리 환경)
if [ -d backend/prisma/migrations ] && [ "$(ls -A backend/prisma/migrations 2>/dev/null)" ]; then
  echo "[*] Prisma migrate deploy..."
  docker compose exec -T backend npx prisma migrate deploy
else
  echo "[*] Prisma db push (마이그레이션 없음 → 스키마 직접 적용)..."
  docker compose exec -T backend npx prisma db push --accept-data-loss
fi

echo "[*] 기본 계정 확인/생성..."
docker compose exec -T backend node prisma/ensureUsers.cjs

# frontend 의존성 안내 (최초 1회만)
if [ ! -d frontend/node_modules ]; then
  echo ""
  echo "ℹ️  frontend/node_modules 가 없습니다. 별도 터미널에서 다음을 먼저 실행하세요:"
  echo "    cd frontend && npm install"
fi

echo ""
echo "✅ 백엔드 기동 완료"
echo "   Backend  : http://localhost:4000   (docker)"
echo "   Postgres : localhost:${POSTGRES_PORT:-5433}   (docker)"
echo ""
echo "▶ 프론트는 별도 터미널에서 직접 실행하세요:"
echo "    cd frontend && npm run dev      → http://localhost:3000"
echo ""
echo "백엔드 로그 : docker compose logs -f backend"
echo "백엔드 종료 : ./stop.sh"
