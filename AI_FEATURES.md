# AI Features Roadmap

This document tracks AI-related UI/UX placeholders already added and the
planned capabilities to be implemented later. The goal is to keep this
list actionable for both frontend and backend work.

## Currently placed (UI only)
- Home: "AI 맞춤 추천" section (login-only, skeleton cards).
- Auction detail: "비슷한 경매" section (skeleton cards).
- Auction registration: "AI 시작가 추천" card (skeleton + apply button placeholder).
- Wishlist: "찜 기반 추천" section (skeleton cards).

## Next MVP candidates
- Personalized auction recommendations (login users).
- Similar auctions based on category/price/keywords.
- Start bid suggestion on auction registration.
- Wishlist-based recommendations (use wishlist product ids).

## Additional ideas to consider
- Search: query correction and keyword expansion.
- Notifications: priority scoring (important first).
- MyPage: bidding habit summary and deposit guidance.
- Product registration: auto category suggestion + description summary.
- Price trend badges: "최근 낙찰 평균가" vs current bid.

## Data requirements (minimum)
- User behavior events: view, bid, wishlist, search.
- Auction/product metadata: category, price, status, end time.
- Auction results: final bid price, winnerId.

## Suggested API endpoints (draft)
- GET /api/v1/recommendations/me
- GET /api/v1/auctions/{auctionId}/similar
- POST /api/v1/auctions/price-suggestion
- GET /api/v1/recommendations/wishlist

## Notes
- MVP can start with rules (category/price/recency) and upgrade later.
- Keep responses small and cacheable on the client.
