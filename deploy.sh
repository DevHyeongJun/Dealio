#!/usr/bin/env bash
# 한 줄 배포 스크립트.
# postgres + backend + frontend 를 도커로 빌드하고 백그라운드 실행한다.
#
# 사용법:
#   ./deploy.sh           # 평소: 변경된 부분만 빌드 후 띄움
#   ./deploy.sh --pull    # git pull 먼저 (서버에서 최신 코드로 갱신할 때)
#   ./deploy.sh --no-cache # 처음부터 빌드 (캐시 무시)
#   ./deploy.sh --logs    # 띄운 후 로그 follow
set -euo pipefail

cd "$(dirname "$0")"

DO_PULL=0
NO_CACHE=0
SHOW_LOGS=0
for arg in "$@"; do
  case "$arg" in
    --pull) DO_PULL=1 ;;
    --no-cache) NO_CACHE=1 ;;
    --logs) SHOW_LOGS=1 ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *) echo "알 수 없는 옵션: $arg"; exit 1 ;;
  esac
done

# .env 보장
if [ ! -f .env ]; then
  echo "[*] .env 가 없습니다. .env.example 에서 복사합니다."
  cp .env.example .env
fi
if [ ! -f backend/.env ]; then
  echo "[*] backend/.env 가 없습니다. backend/.env.example 에서 복사합니다."
  cp backend/.env.example backend/.env
fi

# 코드 갱신 (옵션)
if [ "$DO_PULL" = "1" ]; then
  echo "[*] git pull..."
  git pull --ff-only
fi

# 빌드
echo "[*] 도커 이미지 빌드..."
if [ "$NO_CACHE" = "1" ]; then
  docker compose build --no-cache
else
  docker compose build
fi

# 띄우기
# 기존 컨테이너 정리 (잔여 컨테이너 이름 충돌 방지)
# Postgres 데이터는 ./pg_data 볼륨에 보존되므로 안전.
echo "[*] 기존 컨테이너 정리..."
docker compose down --remove-orphans || true

echo "[*] 컨테이너 기동 (-d)..."
docker compose up -d --remove-orphans

# 상태 확인
echo
echo "[*] 컨테이너 상태:"
docker compose ps

# 안내
echo
FRONT_PORT="${FRONTEND_PORT:-3001}"
echo "[✓] 배포 완료"
echo "    - Frontend : http://localhost:${FRONT_PORT}/dealio/"
echo "    - Backend  : http://localhost:4000/dealio/api/"
echo "    - Postgres : localhost:${POSTGRES_PORT:-5433}"

if [ "$SHOW_LOGS" = "1" ]; then
  echo
  echo "[*] 로그 follow (Ctrl+C 로 종료, 컨테이너는 계속 실행됩니다):"
  docker compose logs -f --tail=50
fi
