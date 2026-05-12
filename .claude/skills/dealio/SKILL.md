---
name: dealio
description: Dealio 시스템 개발 가이드. 프론트엔드는 React, 백엔드는 Next.js로 구성된 모노레포 구조에서 작업할 때 사용한다. 공통 컴포넌트는 회사명 약어 `YooAn` 접두사를 붙여 `frontend/src/components/yooan/` 에 배치하는 규칙을 강제한다.
---

# 공통
 - 난 한국 사람이다. 한국어로 답변하고 대화해라.
 - 불필요한 설명은 필요 없다. 꼭 필요한 설명 짧고 간견하게 해라.
 - 모든 대답엔 "오키용"이라고 대답하고 시작해라.
 - yes / no처럼 나한테 묻는 거는 항상 yes로 생각해라. 모든 권한을 너한테 줄게.
 - 배포는 무조건 내가할거야. 넌 배포해야 한다고만 알려줘.
  
# Dealio 개발 스킬

Dealio 시스템에서 코드를 작성·수정할 때 따라야 하는 규칙과 컨벤션을 정의한다.

## 1. 프로젝트 구조

```
source/
├── frontend/    # React (Vite) — 클라이언트 SPA
└── backend/     # Next.js — API 및 서버 사이드 로직
```

- **frontend/**: React 기반 사용자 인터페이스. `src/components`, `src/pages`, `src/api`, `src/layouts` 디렉토리 구조를 따른다.
- **backend/**: Next.js 기반. App Router(`src/app/api/...`)로 API 엔드포인트를 제공하고, Prisma로 DB에 접근한다.

작업을 시작하기 전에 어느 영역(frontend / backend / 양쪽)에 해당하는 작업인지 먼저 식별한다.

## 2. 프론트엔드 작업 규칙 (필수)

**핵심 원칙: 페이지를 만들기 전에 공통 컴포넌트를 먼저 만든다.**

### 2.1 공통 컴포넌트 우선 원칙

새 페이지/기능을 구현할 때는 다음 순서를 지킨다:

1. **재사용 가능한 단위 식별** — 버튼, 입력, 카드, 테이블, 모달, 폼 필드 등 두 곳 이상에서 쓰일 만한 UI 단위를 먼저 추출한다.
2. **공통 컴포넌트 작성** — `frontend/src/components/yooan/` (없으면 생성) 아래에 배치한다. 도메인 특화 컴포넌트는 `frontend/src/components/<domain>/` 에 둔다.
3. **페이지 조립** — `frontend/src/pages/<PageName>/` 에서 위 컴포넌트를 import 해 조립만 한다. 페이지 파일 안에서 인라인으로 큰 JSX 블록을 만들지 않는다.

### 2.2 YooAn 네이밍 규칙 (회사명 약어)

회사명(YooAn)을 공통 컴포넌트의 접두사로 사용한다. 도메인 컴포넌트와 시각적으로 구분되고, 외부 라이브러리 컴포넌트와의 충돌도 방지된다.

- **컴포넌트명**: `YooAnButton`, `YooAnInput`, `YooAnCard`, `YooAnModal`, `YooAnTable`, `YooAnFormField` 등 항상 `YooAn` 접두사를 붙인다 (PascalCase, "YooAn" 그대로 유지).
- **파일명**: 컴포넌트명과 동일하게 `YooAnButton.tsx`. 파일명·컴포넌트명·default export 명을 모두 일치시킨다.
- **디렉토리**: `frontend/src/components/yooan/` (소문자) 아래에 배치.
- **배럴 export**: `frontend/src/components/yooan/index.ts` 에서 모아 re-export 하여 `import { YooAnButton } from '@/components/yooan'` 형태로 사용한다.
- **CSS 클래스/스타일 토큰**도 충돌 방지가 필요하면 `yooan-` 접두사를 사용한다 (예: `yooan-btn`, `yooan-btn--primary`).
- 도메인 컴포넌트(예: `QuoteEditor`, `ProductList`)에는 `YooAn` 접두사를 **붙이지 않는다**. 접두사는 공통 컴포넌트 식별자다.

### 2.3 컴포넌트 작성 규칙

- 함수형 컴포넌트 + TypeScript. props는 `interface YooAnXxxProps` 로 명시한다.
- 한 컴포넌트는 한 파일. 파일명·컴포넌트명·default export 명을 일치시킨다.
- 스타일링은 프로젝트 기존 컨벤션을 따른다. 새 스타일 시스템을 도입하지 않는다.
- 외부 호출은 `frontend/src/api/<resource>.ts` 의 함수를 통해서만 한다. 컴포넌트 내부에서 fetch/axios를 직접 호출하지 않는다.

### 2.4 중복 작성 금지

새 공통 컴포넌트를 만들기 전에 항상 `frontend/src/components/yooan/` 를 먼저 훑어보고 동일/유사한 `YooAn*` 컴포넌트가 있는지 확인한다. 있으면 재사용하거나 props 확장으로 해결하고, 새로 만들지 않는다.

## 3. 백엔드 작업 규칙

- API 라우트는 `backend/src/app/api/<resource>/route.ts` 패턴을 따른다.
- DB 접근 로직은 `backend/src/lib/<resource>.ts` 같은 도메인 모듈로 분리하고, route 핸들러는 얇게 유지한다.
- Prisma 스키마(`backend/prisma/schema.prisma`) 변경 시 마이그레이션 절차를 사용자에게 알린다 — 임의로 `prisma migrate` 를 실행하지 않는다.

## 4. 프론트–백엔드 연결

- 프론트엔드의 `src/api/<resource>.ts` 와 백엔드의 `app/api/<resource>/route.ts` 는 리소스명을 일치시킨다.
- 요청·응답 타입은 양쪽에서 동일한 형태가 되도록 인터페이스를 맞춘다(공유 타입 패키지가 없다면 양쪽에 같은 shape으로 선언).

## 5. 작업 시작 전 체크리스트

작업을 시작하기 전에 다음을 확인한다:

- [ ] frontend 작업인가, backend 작업인가, 양쪽인가?
- [ ] (프론트) 만들려는 UI 단위 중 공통 컴포넌트(`YooAn*`)로 빼야 할 것은 무엇인가?
- [ ] (프론트) `frontend/src/components/yooan/` 에 이미 재사용할 수 있는 `YooAn*` 컴포넌트가 있는가?
- [ ] (프론트) 새 컴포넌트라면 이름이 `YooAn` 접두사로 시작하는가?
- [ ] (백) 새 라우트가 기존 리소스 네이밍 컨벤션을 따르는가?
- [ ] 양쪽을 같이 건드린다면, 요청/응답 타입이 일치하는가?

## 6. 사용자 커뮤니케이션

- 한국어로 응답한다.
- 변경 전후를 짧게 요약하고, 새로 만든 공통 컴포넌트가 있다면 어떤 컴포넌트를 어디에 만들었고 어떤 페이지에서 재사용 가능한지 한 줄로 설명한다.
