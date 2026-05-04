# 견적서 관리 시스템

견적서를 관리·발행·메일 발송하는 시스템입니다. 좌측 사이드바 기반의 반응형 웹 UI를 제공합니다.

## 구성

```
source/
├── backend/    # Next.js (App Router) — API 서버 + Prisma + PostgreSQL
└── frontend/   # React + Vite + Tailwind CSS — SPA
```

- 포트: frontend `3000`, backend `4000`, postgres `5432`
- 프론트엔드는 Nginx에서 정적 서빙되고 `/api/*` 요청은 백엔드로 프록시됩니다.

## 빠른 시작 (Docker)

```bash
cp .env.example .env
docker compose up --build
```

브라우저에서 http://localhost:3000 접속.

## 로컬 개발

### Backend

```bash
cd backend
cp .env.example .env       # DATABASE_URL 설정
npm install
npx prisma migrate dev
npm run dev                # http://localhost:4000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                # http://localhost:3000 (백엔드 4000으로 프록시)
```

## 메뉴

- **견적서 관리**: 목록 / 신규 / 상세 / 수정 / 삭제
  - 검색(고객명·번호) 및 상태 필터
  - 품목 추가·수정 시 합계 자동 계산
- 메일 발송 기능은 후속 작업 예정.
