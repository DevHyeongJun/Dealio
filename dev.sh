#!/usr/bin/env bash
# 로컬 개발 모드: postgres만 Docker로 띄우고 backend/frontend는 호스트에서 실행
# 코드 수정 시 핫리로드가 필요할 때 사용.
# 사용법: ./dev.sh
set -euo pipefail

cd "$(dirname "$0")"

# .env 준비
if [ ! -f .env ]; then cp .env.example .env; fi
if [ ! -f backend/.env ]; then cp backend/.env.example backend/.env; fi

# Postgres만 백그라운드로 실행
echo "[*] Postgres 컨테이너 기동..."
docker compose up -d postgres

# Postgres 헬스체크 대기
echo "[*] Postgres 준비 대기..."
until docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; do
  sleep 1
done
echo "    ready."

# 의존성 설치 (최초 1회)
if [ ! -d backend/node_modules ]; then
  echo "[*] backend 의존성 설치..."
  (cd backend && npm install)
fi
if [ ! -d frontend/node_modules ]; then
  echo "[*] frontend 의존성 설치..."
  (cd frontend && npm install)
fi

# Prisma 마이그레이션
echo "[*] Prisma migrate..."
(cd backend && npx prisma migrate deploy)

# 종료 시 자식 프로세스 정리
PIDS=()
cleanup() {
  echo ""
  echo "[*] 종료 중..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

echo "[*] backend 실행 (http://localhost:4000)"
(cd backend && npm run dev) &
PIDS+=($!)

echo "[*] frontend 실행 (http://localhost:3000)"
(cd frontend && npm run dev) &
PIDS+=($!)

echo ""
echo "✅ 개발 서버 실행 중. Ctrl+C 로 종료."
wait
