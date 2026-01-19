# 🏷️ More Auction Frontend

사용자 웹과 어드민을 함께 관리하는 프론트엔드 모노레포입니다. 경매/상품/주문/예치금 등 핵심 도메인 UI를 제공하고, 실시간 경매 상태는 웹소켓으로 처리합니다.

---

## 📦 Monorepo

- `web/` 사용자 웹 (경매/상품/마이페이지)
- `admin/` 어드민 웹
- `packages/` 공용 패키지
  - `@moreauction/types`
  - `@moreauction/utils`
  - `@moreauction/api-client`

---

## 🧰 Tech Stack

- Runtime: React 19, TypeScript, Vite
- UI: MUI, Emotion
- Data: TanStack Query, Axios
- Routing: React Router
- Forms: React Hook Form
- Realtime: STOMP + SockJS
- Utils: date-fns, qs
- Package Manager: pnpm (workspace)

---

## 🚀 Getting Started

```bash
pnpm install
pnpm dev        # web
pnpm dev:admin  # admin
```

Build / Lint

```bash
pnpm build
pnpm build:admin
pnpm lint:web
pnpm lint:admin
```

---

## 🗂️ Structure (Domain-first)

```
web/src
  features/
    auctions/        # 경매
      components/
      pages/
    products/
      pages/
    mypage/
      components/
      pages/
    auth/
      pages/
      pages/oauth/
    orders/
      pages/
    notifications/
      pages/
    search/
      pages/
    wishlist/
      pages/
    profile/
      pages/
    settings/
      pages/
    home/
      pages/
    payments/
      pages/payment/
    chat/
      components/
      hooks/
  shared/
    components/      # 공용 UI
    utils/           # 공용 유틸
  apis/
  contexts/
  hooks/
  queries/
  routes/
  theme.ts
  main.tsx
  App.tsx
```

---

## 🔗 Import Alias

- Web/Admin 모두 `@/` 기준으로 import
- 예:

```ts
import AuctionList from "@/features/auctions/components/AuctionList";
```

설정 파일
- `web/tsconfig.app.json`, `web/vite.config.ts`
- `admin/tsconfig.app.json`, `admin/vite.config.ts`

---

## ✨ Web Features

- 경매 목록/상세, 실시간 입찰 내역
- 상품 등록/수정/상세
- 주문/예치금/정산 관리
- 알림/찜/검색
- OAuth 로그인

---

## ⚡ Realtime

- 진행 중 경매(`IN_PROGRESS`)만 웹소켓 연결
- 연결 상태는 뱃지로 표현
- 오프라인 감지 시 실패 상태 전환

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

간단 예시 (hook 사용)

```ts
const { messages, sendMessage } = useChat();
sendMessage("경매 참여 방법 알려줘");
```

---

## 🔐 Environment Variables

```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=http://localhost:8000
```

---

## ✅ Conventions

- 도메인별 `features` 폴더에서 페이지/컴포넌트 관리
- 공용 UI는 `shared/components`
- 공용 유틸은 `shared/utils`
- 모든 import는 `@/` alias 사용
