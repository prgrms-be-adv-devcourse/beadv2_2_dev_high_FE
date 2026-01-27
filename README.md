# 🏷️ More Auction Frontend

More Auction의 사용자 웹과 어드민을 함께 운영하는 프론트엔드 모노레포입니다. 경매, 상품, 주문, 결제/예치금 등 핵심 도메인을 React 기반으로 구성했고, 실시간 경매 상태는 WebSocket(STOMP/SockJS)으로 처리합니다.

---

## 🧩 제품 개요

- 사용자 웹: 경매 참여, 상품 탐색, 주문/결제, 마이페이지 등 사용자 플로우 제공
- 어드민: 경매/상품/주문/정산 관리, 운영 업무 지원
- 공용 패키지: 타입/유틸/인증/공용 UI를 패키지로 분리해 일관성과 재사용성 확보

---

## 📦 Monorepo 구성

- `web/` 사용자 웹 (React + Vite)
- `admin/` 어드민 웹 (React + Vite)
- `packages/` 공용 패키지
  - `@moreauction/types`: 도메인/응답 타입 정의
  - `@moreauction/utils`: 공용 유틸리티
  - `@moreauction/api-client`: API 클라이언트, 공통 인터셉터
  - `@moreauction/ui`: 공용 UI 컴포넌트/테마
  - `@moreauction/auth`: 인증 상태, 세션 처리

---

## 🧰 Tech Stack

- React 19, TypeScript, Vite
- MUI + Emotion
- TanStack Query + Axios
- React Router, React Hook Form
- STOMP + SockJS
- pnpm workspaces

---

## 🧭 아키텍처

- FSD(Feature-Sliced Design) 기반의 도메인 중심 구조
- 페이지는 레이아웃/조합 중심, UI 블록/데이터 로직은 컴포넌트/훅으로 분리
- 서버 상태는 TanStack Query로 단일 관리
- 공용 타입/유틸/인증/UI는 `packages/*`로 분리
- Web/Admin 모두 `@/` alias 기준 import

---

## ✅ 컨벤션 (요약)

- 페이지 파일은 화면 배치/조합 중심으로 유지
- UI 블록과 데이터 로직은 분리하여 컴포넌트/훅으로 관리
- 공용 요소는 `shared/*` 또는 `packages/*`로 승격
- 중복되는 로직은 패키지로 이동하여 재사용

---

## 🗂️ 디렉터리 구조

```
web/src
  features/
    auctions/
      components/
      pages/
    products/
      pages/
    orders/
      pages/
    auth/
      pages/
      pages/oauth/
    notifications/
      pages/
    chat/
      components/
      hooks/
  shared/
    components/
    utils/
  apis/
  hooks/
  routes/
  theme.ts
  main.tsx
  App.tsx
```

```
admin/src
  features/
    <domain>/
      components/
      hooks/
      pages/
  shared/
    components/
    styles/
    theme/
  apis/
  hooks/
  routes/
```

```
packages/
  api-client/
  auth/
  types/
  ui/
  utils/
```

---

## 🔗 Import Alias

```ts
import AuctionList from "@/features/auctions/components/AuctionList";
```

설정 파일
- `web/tsconfig.app.json`, `web/vite.config.ts`
- `admin/tsconfig.app.json`, `admin/vite.config.ts`

---

## ⚡ Realtime (Web)

- 경매 시작/종료 기준 ±10분 구간에서 WebSocket 연결
- 연결 상태를 UI 배지로 표시
- 연결 실패/오프라인 상태를 별도 처리

---

## 🤖 AI Chatbot MVP (Skeleton)

- 플로팅 FAB + 패널 UI
- 메시지 상태 관리 훅
- `POST /chat/messages` API 스텁

관련 파일
- `web/src/features/chat/components/ChatWidget.tsx`
- `web/src/features/chat/components/ChatPanel.tsx`
- `web/src/features/chat/hooks/useChat.ts`
- `web/src/apis/chatApi.ts`

```ts
const { messages, sendMessage } = useChat();
sendMessage("경매 참여 방법 알려줘");
```

---

## 🔐 환경 변수

```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=http://localhost:8000
```

---

## 🚀 시작하기

```bash
pnpm install
pnpm dev        # web
pnpm dev:admin  # admin
```

빌드 / 린트

```bash
pnpm build
pnpm build:admin
pnpm lint:web
pnpm lint:admin
```

---

## 🧪 테스트/품질

- 기능 개발 시 `pnpm lint:web`, `pnpm lint:admin`으로 린트 확인
- 빌드 전 `pnpm build` / `pnpm build:admin`로 타입/번들 검증

---

## 🔍 참고

- 공용 패키지 변경 시 각 앱에서 `workspace:*` 의존성으로 연동
- 도메인 구조/컨벤션은 `AGENTS.md` 참고
