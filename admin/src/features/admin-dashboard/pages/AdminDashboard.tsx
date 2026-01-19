import { adminAuctionApi } from "@/apis/adminAuctionApi";
import { adminOrderApi } from "@/apis/adminOrderApi";
import { AuctionStatus, OrderStatus } from "@moreauction/types";
import { Box, Card, CardContent, Skeleton, Typography } from "@mui/material";
import {
  keepPreviousData,
  useQueries,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useMemo } from "react";
import StatCard from "../components/StatCard";

export type StatItem = {
  label: string;
  query?: UseQueryResult<any, unknown>;
  getValue?: (data: any) => number;
  staticValue?: number;
};
const AdminDashboard = () => {
  const queryDefaults = {
    staleTime: 20_000,
    placeholderData: keepPreviousData,
  } as const;

  const results = useQueries({
    queries: [
      {
        ...queryDefaults,
        queryKey: ["admin", "users", "count", "sign-up-today"],
        queryFn: () => Promise.resolve({ data: 24 }),
      },
      {
        ...queryDefaults,
        queryKey: ["admin", "auctions", "count", "in-progress"],
        queryFn: () =>
          adminAuctionApi.getAuctionsCount(AuctionStatus.IN_PROGRESS),
      },
      {
        ...queryDefaults,
        queryKey: ["admin", "auctions", "count", "ending-soon"],
        queryFn: adminAuctionApi.getAuctionCountEndingSoon,
      },
      {
        ...queryDefaults,
        queryKey: ["admin", "orders", "count", "unpaid"],
        queryFn: () => adminOrderApi.getOrdersCount(OrderStatus.UNPAID),
      },
    ],
  });

  const stats: StatItem[] = useMemo(
    () => [
      {
        label: "오늘 신규 회원",
        query: results[0],
        getValue: (d) => d?.data ?? 0,
      },
      {
        label: "진행 중 경매",
        query: results[1],
        getValue: (d) => d?.data ?? 0,
      },

      {
        label: "곧 마감되는 경매",
        query: results[2],
        getValue: (d) => d?.data ?? 0,
      },
      {
        label: "구매 대기",
        query: results[3],
        getValue: (d) => d?.data ?? 0,
      },
    ],
    [results]
  );

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
        대시보드
      </Typography>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
          },
          gap: 2,
        }}
      >
        {stats.map((item) => (
          <StatCard key={item.label} item={item} />
        ))}
      </Box>
    </Box>
  );
};

export default AdminDashboard;
