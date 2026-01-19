import { Card, CardContent, Typography, Skeleton, Box } from "@mui/material";
import type { UseQueryResult } from "@tanstack/react-query";
import type { StatItem } from "../pages/AdminDashboard";

const StatCard = ({ item }: { item: StatItem }) => {
  const q = item.query;

  const isLoading = q?.isLoading ?? false; // 첫 로딩
  const isRefreshing = (q?.isFetching ?? false) && !isLoading; // 값 유지 + 갱신중
  const isError = q?.isError ?? false;

  const value = q
    ? String(item.getValue ? item.getValue(q.data) : q.data?.data ?? 0)
    : String(item.staticValue ?? 0);

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary">
          {item.label}
        </Typography>

        {isLoading ? (
          <Skeleton width={56} height={36} />
        ) : isError ? (
          <Typography variant="h6" color="error">
            -
          </Typography>
        ) : (
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {value}
            </Typography>
            {isRefreshing && (
              <Typography variant="caption" color="text.secondary">
                갱신 중…
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
