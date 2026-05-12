# Dealio

견적서를 관리·발행·메일 발송하는 시스템입니다. 좌측 사이드바 기반의 반응형 웹 UI를 제공합니다.

## 구성

```
source/
├── .env            # docker-compose 전용 (Postgres 컨테이너 셋업)
├── backend/        # Next.js (App Router) — API 서버 + Prisma + PostgreSQL
│   └── .env        # 백엔드 앱 설정 (DATABASE_URL, CORS_ORIGIN, SMTP_*)
└── frontend/       # React + Vite + Tailwind CSS — SPA
    └── .env        # 프론트 앱 설정 (VITE_*)
```

backend / frontend 는 **독립된 프로젝트**로 다룹니다. 각자 `.env` 를 가집니다.

- 포트: frontend `3000`, backend `4000`, postgres `5433` (호스트 매핑)
- 앱은 `/dealio/` 컨텍스트 아래에서 동작합니다. 프론트엔드는 Nginx에서 정적 서빙되고 `/dealio/api/*` 요청은 백엔드로 프록시됩니다.

## 환경변수 (.env)

`.env` 파일은 **gitignore 처리되어 있어** 직접 만들어야 합니다.

### 1) `./.env` — docker-compose 전용
```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=quotation
POSTGRES_PORT=5433
```

### 2) `./backend/.env` — API 서버
```env
# 로컬 개발 시 (npm run dev) 사용. 컴포즈 실행 시는 docker-compose 가 DATABASE_URL 을 자동 오버라이드.
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/quotation?schema=public
CORS_ORIGIN=http://localhost:3000

# SMTP (메일 발송)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=youraccount@gmail.com
SMTP_PASS=앱비밀번호
SMTP_FROM=Dealio <youraccount@gmail.com>
```
> Gmail 은 일반 비밀번호가 아닌 [앱 비밀번호](https://myaccount.google.com/apppasswords)를 사용해야 합니다.

### 3) `./frontend/.env` — 프론트 (로컬 dev 모드)
```env
VITE_API_BASE=/dealio/api
VITE_PROXY_TARGET=http://localhost:4000
```

## 실행

세 개의 `.env` 가 준비되었다면:

```bash
./start.sh           # 처음에는 ./start.sh --build
```

- Postgres + backend 는 Docker 로 띄우고
- frontend 는 호스트(노트북)에서 vite dev 로 백그라운드 실행
- 브라우저: http://localhost:3000/dealio/

```bash
./stop.sh            # 모든 프로세스/컨테이너 종료 (./pg_data 는 유지)
./seed.sh            # 견적서/품목 샘플 데이터 입력 (기존 데이터 삭제됨)
```

## 로컬 개발 (각 프로젝트 단독 실행)

```bash
cd backend && npm install && npm run dev      # http://localhost:4000
cd frontend && npm install && npm run dev     # http://localhost:3000
```

## 메뉴

- **견적서 관리** — 목록 / 신규 / 상세 / 수정 / 삭제, 검색·상태 필터, 메일 발송 + 발송 이력
- **품목 관리** — 견적서 작성 시 끌어다 쓸 마스터 품목 카탈로그
- **환경설정**
