#!/usr/bin/env bash
# 시드 데이터 입력 (postgres 컨테이너가 실행 중이어야 함)
# 주의: 기존 견적서/품목 데이터를 모두 삭제하고 샘플 데이터를 새로 입력합니다.
set -euo pipefail

cd "$(dirname "$0")"

# 호스트 매핑 포트 (.env 가 있으면 거기서 읽고, 없으면 5433 기본값)
HOST_PORT="${POSTGRES_PORT:-5433}"
if [ -f .env ]; then
  HOST_PORT="$(grep -E '^POSTGRES_PORT=' .env | cut -d= -f2 || echo "$HOST_PORT")"
  HOST_PORT="${HOST_PORT:-5433}"
fi

# Postgres 가 떠있는지 확인
if ! docker compose ps postgres --status running --quiet >/dev/null 2>&1; then
  echo "[*] Postgres 컨테이너가 실행 중이 아닙니다. 시작합니다..."
  docker compose up -d postgres
  echo "[*] Postgres 준비 대기..."
  until docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; do
    sleep 1
  done
fi

cd backend

# tsx 가 없으면(또는 node_modules 자체가 없으면) 의존성 재설치
if [ ! -x node_modules/.bin/tsx ]; then
  echo "[*] backend 의존성 설치 (tsx 필요)..."
  npm install
fi

echo "[*] 스키마 동기화..."
DATABASE_URL="postgresql://postgres:postgres@localhost:${HOST_PORT}/quotation?schema=public" \
  npx prisma db push --accept-data-loss

echo "[*] Prisma Client 재생성..."
npx prisma generate

echo "[*] 시드 실행..."
DATABASE_URL="postgresql://postgres:postgres@localhost:${HOST_PORT}/quotation?schema=public" \
  npm run db:seed

echo ""
echo "✅ 시드 완료"
