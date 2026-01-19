# AGENTS.md

This repository is a frontend monorepo for the More Auction product. Use this
file as the project-specific guide for changes, commands, and conventions.

## Scope and structure

- `web/` is the user-facing app.
- `admin/` is the admin app.
- `packages/` contains shared workspace packages:
  - `@moreauction/types`
  - `@moreauction/utils`
  - `@moreauction/api-client`
  - `@moreauction/ui`
  - `@moreauction/auth`

## Tech stack (both apps)

- React + TypeScript + Vite
- MUI + Emotion
- TanStack Query + Axios
- React Router, React Hook Form
- Realtime via STOMP + SockJS (web app)

## Commands (run from repo root)

- `pnpm install`
- `pnpm dev` / `pnpm dev:web`
- `pnpm dev:admin`
- `pnpm build` / `pnpm build:admin`
- `pnpm lint:web` / `pnpm lint:admin`

## Conventions

### Monorepo

- Use the `@/` import alias in both apps.
- Prefer reusing shared packages (`packages/*`) over duplicating logic in `web/` or `admin/`.
- If code is reused by BOTH `web` and `admin`, move it into `packages/*` and add workspace deps:
  - `@moreauction/api-client`: `workspace:*`
  - `@moreauction/auth`: `workspace:*`
  - `@moreauction/types`: `workspace:*`
  - `@moreauction/utils`: `workspace:*`
  - `@moreauction/ui`: `workspace:*`
- UI/theme primitives shared across apps should live in `@moreauction/ui`.
- Auth state and session handling shared across apps should live in `@moreauction/auth`.

### Web (`web/`)

- Domain-first structure: `web/src/features/<domain>/*`
- Route screens: `web/src/features/<domain>/pages/*`
- Domain UI: `web/src/features/<domain>/components/*`
- Web-shared: `web/src/shared/*` (e.g., `components/`, `utils/`, `contexts/`, `constants/`, `providers/`, `queryKeys/` as needed)
- Web APIs: `web/src/apis/*` (import via `@/apis/*`)
- Shared hooks (cross-domain): `web/src/hooks/*`

### Admin (`admin/`)

- Mirror the web structure: `admin/src/features/<domain>/*`
- Route screens: `admin/src/features/<domain>/pages/*`
- Domain UI: `admin/src/features/<domain>/components/*`
- Domain hooks (queries/mutations/data logic): `admin/src/features/<domain>/hooks/*`
- Admin-shared: `admin/src/shared/*` (e.g., `components/`, `contexts/`, `theme/`, `styles/`)
- Admin APIs: `admin/src/apis/*` (import via `@/apis/*`)
- Shared hooks (cross-domain): `admin/src/hooks/*`

### Component structure (project-wide)

- Keep route-level page files focused on layout/composition (wiring only).
- Split a file when any of these happens:
  - 2+ distinct UI blocks live together (filters + list/table + modal/form).
  - UI rendering is mixed with heavy event/data logic (many handlers/branches).
  - A UI block has its own state/validation (forms, dialogs, complex tables).
- During ongoing work, continually extract components to keep files from growing too large; avoid letting a single file become a catch-all.
- Placement:
  - Domain-only UI → `features/<domain>/components/*`
  - Page-only UI → colocate near the page (e.g., `.../pages/<Page>/components/*`)
  - Data/handler logic → `features/<domain>/hooks/*`
- Promotion rule:
  - Used in 2+ places within the SAME app → move to that app’s `shared/*`
  - Used in BOTH apps → move to `packages/*`

## Caching rules (TanStack Query)

- Keep server state in TanStack Query (avoid duplicated fetching/state).
- After create/update/delete mutations, update cache appropriately:
  - Use `setQueryData` for immediate UI updates when the new server state is known (e.g., mutation response, small field changes).
  - Use `invalidateQueries` to revalidate affected queries for correctness.
  - Use `invalidateQueries({ refetchType: "none" })` to mark stale without immediate refetch when the UI is already updated (avoid excessive network calls).
- Always invalidate/update the minimal necessary scope (target list/detail keys; avoid broad invalidations).
- Navigation/Loading:
  - Back/forward should show correct data (render from cache first; refetch in background if needed).
  - Prefer skeleton loading states (small, component-level) over full-page spinners.

## Refactoring rules

- Refactors must not change behavior/routing/API contracts unless explicitly requested.
- Prefer small, incremental changes (one domain/page at a time) and keep builds green (`pnpm lint:*`, `pnpm build:*`).
- Extract components/hooks first, then move files; use temporary re-exports (bridge files) to minimize import churn.
- Preserve type safety and UX states (loading/skeleton/empty/error) during refactors.

## React safety notes

- Avoid using `const`/`let` functions before their declaration in a component body; define handlers/helpers before any `useEffect`/`useMemo`/JSX that calls them to prevent temporal dead zone runtime errors.
