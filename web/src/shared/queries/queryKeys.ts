const toStableIdList = (items?: Array<string | number | null | undefined>) => {
  if (!items || items.length === 0) return [];
  return items
    .filter(
      (item): item is string | number => item !== null && item !== undefined
    )
    .map((item) => (typeof item === "string" ? item : String(item)))
    .filter((item) => item.length > 0)
    .sort();
};

export const queryKeys = {
  auctions: {
    all: ["auctions"] as const,
    lists: () => [...queryKeys.auctions.all, "list"] as const,
    list: (statusKey: string, sortOption?: string, limit?: number) =>
      [
        ...queryKeys.auctions.all,
        "list",
        statusKey || "all",
        sortOption ?? "default",
        limit ?? "all",
      ] as const,
    details: () => [...queryKeys.auctions.all, "detail"] as const,
    detail: (auctionId?: string | null) =>
      [...queryKeys.auctions.all, "detail", auctionId ?? "unknown"] as const,
    many: (auctionIds?: Array<string | number | null | undefined>) =>
      [...queryKeys.auctions.all, "many", toStableIdList(auctionIds)] as const,
    byProduct: (productId?: string | null) =>
      [...queryKeys.auctions.all, "byProduct", productId ?? "unknown"] as const,
    recommendation: (productId?: string | null) =>
      [
        ...queryKeys.auctions.all,
        "recommendation",
        productId ?? "unknown",
      ] as const,
    participation: (auctionId?: string | null) =>
      [
        ...queryKeys.auctions.all,
        "participation",
        auctionId ?? "unknown",
      ] as const,
    bidBan: (auctionId?: string | null, userId?: string | null) =>
      [
        ...queryKeys.auctions.all,
        "bidBan",
        auctionId ?? "unknown",
        userId ?? "anonymous",
      ] as const,
    participationHistory: (userId?: string | null, pageSize?: number | null) =>
      [
        ...queryKeys.auctions.all,
        "participationHistory",
        userId ?? "anonymous",
        pageSize ?? "default",
      ] as const,
    bidHistory: (auctionId?: string | null) =>
      [
        ...queryKeys.auctions.all,
        "bidHistory",
        auctionId ?? "unknown",
      ] as const,
    featured: (status?: string | null) =>
      [...queryKeys.auctions.all, "featured", status ?? "all"] as const,
    topToday: (limit?: number | null) =>
      [...queryKeys.auctions.all, "topToday", limit ?? "default"] as const,
  },
  products: {
    all: ["products"] as const,
    lists: () => [...queryKeys.products.all, "list"] as const,
    list: (page?: number | null) =>
      [...queryKeys.products.all, "list", page ?? "all"] as const,
    details: () => [...queryKeys.products.all, "detail"] as const,
    detail: (productId?: string | null) =>
      [...queryKeys.products.all, "detail", productId ?? "unknown"] as const,
    mine: (userId?: string | null) =>
      [...queryKeys.products.all, "mine", userId ?? "anonymous"] as const,
    many: (productIds?: Array<string | number | null | undefined>) =>
      [...queryKeys.products.all, "many", toStableIdList(productIds)] as const,
  },
  files: {
    all: ["files"] as const,
    group: (groupId?: string | number | null) =>
      [...queryKeys.files.all, "group", groupId ?? "unknown"] as const,
    groups: (groupIds?: Array<string | number | null | undefined>) =>
      [...queryKeys.files.all, "groups", toStableIdList(groupIds)] as const,
    searchGroups: (groupIds?: Array<string | number | null | undefined>) =>
      [
        ...queryKeys.files.all,
        "groups",
        "search",
        toStableIdList(groupIds),
      ] as const,
  },
  categories: {
    all: ["categories"] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    lists: () => [...queryKeys.notifications.all, "list"] as const,
    unreadCount: () => [...queryKeys.notifications.all, "unreadCount"] as const,
    list: (userId?: string | null) =>
      [...queryKeys.notifications.all, "list", userId ?? "anonymous"] as const,
    unreadList: (userId?: string | null) =>
      [
        ...queryKeys.notifications.all,
        "list",
        "unread",
        userId ?? "anonymous",
      ] as const,
    headerListBase: (userId?: string | null) =>
      [
        ...queryKeys.notifications.all,
        "list",
        "header",
        userId ?? "anonymous",
      ] as const,
    headerList: (userId?: string | null, scope: "unread" | "all" = "unread") =>
      [
        ...queryKeys.notifications.all,
        "list",
        "header",
        userId ?? "anonymous",
        scope,
      ] as const,
  },
  deposit: {
    all: ["deposit"] as const,
    balance: () => [...queryKeys.deposit.all, "balance"] as const,
    account: () => [...queryKeys.deposit.all, "account"] as const,
    historyAll: () => [...queryKeys.deposit.all, "history"] as const,
    history: (type?: string | null) =>
      [...queryKeys.deposit.all, "history", type ?? "all"] as const,
    payments: () => [...queryKeys.deposit.all, "payments"] as const,
    paymentOrder: (orderId?: string | null) =>
      [...queryKeys.deposit.all, "paymentOrder", orderId ?? "unknown"] as const,
    paymentFailures: () =>
      [...queryKeys.deposit.all, "paymentFailures"] as const,
    paymentFailuresByOrder: (orderId?: string | null) =>
      [
        ...queryKeys.deposit.all,
        "paymentFailures",
        orderId ?? "unknown",
      ] as const,
  },
  orders: {
    all: ["orders"] as const,
    pendings: () => [...queryKeys.orders.all, "pending"] as const,
    histories: () => [...queryKeys.orders.all, "history"] as const,
    history: (kind?: string | null, userId?: string | null) =>
      [
        ...queryKeys.orders.all,
        "history",
        kind ?? "all",
        userId ?? "anonymous",
      ] as const,
    detail: (orderId?: string | null) =>
      [...queryKeys.orders.all, "detail", orderId ?? "unknown"] as const,
    pendingCount: () => [...queryKeys.orders.all, "pendingCount"] as const,
    pending: (userId?: string | null) =>
      [...queryKeys.orders.all, "pending", userId ?? "anonymous"] as const,
  },
  wishlist: {
    all: ["wishlist"] as const,
    list: (userId?: string | null) =>
      [...queryKeys.wishlist.all, userId ?? "anonymous"] as const,
    detail: (userId?: string | null, productId?: string | null) =>
      [
        ...queryKeys.wishlist.all,
        "detail",
        userId ?? "anonymous",
        productId ?? "unknown",
      ] as const,
    recommendations: (userId?: string | null) =>
      [
        ...queryKeys.wishlist.all,
        "recommendations",
        userId ?? "anonymous",
      ] as const,
    activityRecommendations: (userId?: string | null) =>
      [
        ...queryKeys.wishlist.all,
        "activityRecommendations",
        userId ?? "anonymous",
      ] as const,
  },
  user: {
    all: ["user"] as const,
    me: () => [...queryKeys.user.all, "me"] as const,
    addresses: () => [...queryKeys.user.all, "addresses"] as const,
    detail: (userId?: string | null) =>
      [...queryKeys.user.all, "detail", userId ?? "unknown"] as const,
    many: (userIds?: Array<string | null | undefined>) =>
      [...queryKeys.user.all, "many", toStableIdList(userIds)] as const,
  },
  seller: {
    all: ["seller"] as const,
    info: () => [...queryKeys.seller.all, "info"] as const,
  },
  settlement: {
    all: ["settlement"] as const,
    summary: (pageSize: number) =>
      [...queryKeys.settlement.all, "summary", pageSize] as const,
    history: (pageSize: number) =>
      [...queryKeys.settlement.all, "history", pageSize] as const,
    groupItems: (groupId: string, pageSize: number) =>
      [...queryKeys.settlement.all, "group", groupId, pageSize] as const,
  },
  search: {
    all: ["search"] as const,
    auctions: (
      keyword: string,
      status: string,
      categoryKey: string,
      minStartPrice: string,
      maxStartPrice: string,
      startFrom: string,
      startTo: string,
      page: number
    ) =>
      [
        ...queryKeys.search.all,
        keyword,
        status,
        categoryKey,
        minStartPrice,
        maxStartPrice,
        startFrom,
        startTo,
        page,
      ] as const,
    similar: (productId?: string | null, limit?: number | null) =>
      [
        ...queryKeys.search.all,
        "similar",
        productId ?? "unknown",
        limit ?? "default",
      ] as const,
  },
};
