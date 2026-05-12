#!/usr/bin/env bash
# 종료: Docker (postgres, backend) 만 내린다. DB 데이터는 ./pg_data 에 그대로 유지.
# Frontend(Vite) 는 사용자가 직접 띄운 것이므로 이 스크립트는 건드리지 않는다 — 해당 터미널에서 Ctrl+C 로 종료하세요.
# 사용법: ./stop.sh
set -euo pipefail

cd "$(dirname "$0")"

echo "[*] 컨테이너 종료 (./pg_data 는 그대로 유지)"
docker compose down

echo "✅ 종료 완료. DB 데이터는 ./pg_data 에 보관되어 있습니다."
echo "   프론트(vite)가 따로 떠 있다면 해당 터미널에서 Ctrl+C 로 종료하세요."
