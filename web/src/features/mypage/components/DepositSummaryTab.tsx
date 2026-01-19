import {
  Alert,
  Box,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Skeleton,
  Typography,
} from "@mui/material";
import { hasRole, UserRole } from "@moreauction/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { depositApi } from "@/apis/depositApi";
import { userApi } from "@/apis/userApi";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/queries/queryKeys";
import { getErrorMessage } from "@/utils/getErrorMessage";

export const DepositSummaryTab: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const roles = user?.roles;
  const sellerInfoQuery = useQuery({
    queryKey: queryKeys.seller.info(),
    queryFn: () => userApi.getSellerInfo(),
    staleTime: 60_000,
  });
  const sellerInfo = sellerInfoQuery.data?.data ?? null;
  const loading = sellerInfoQuery.isLoading;
  const errorMessage = sellerInfoQuery.isError
    ? getErrorMessage(
        sellerInfoQuery.error,
        "정산 계좌 정보를 불러오지 못했습니다."
      )
    : null;

  const handleCreateAccount = async () => {
    try {
      const res = await depositApi.createAccount(user?.userId);
      if (res?.data) {
        alert("예치금 계좌가 생성되었습니다.");
        queryClient.setQueryData(queryKeys.deposit.account(), res);
        if (typeof res.data.balance === "number") {
          queryClient.setQueryData(
            queryKeys.deposit.balance(),
            res.data.balance
          );
          localStorage.setItem("depositBalance", String(res.data.balance));
        }
        await queryClient.invalidateQueries({
          queryKey: queryKeys.deposit.history(),
        });
      }
    } catch (err: any) {
      alert("계좌 생성 실패: " + (err?.data?.message ?? "알 수 없는 오류"));
    }
  };

  const isBuyerOnly =
    hasRole(roles, UserRole.USER) && !hasRole(roles, UserRole.SELLER);

  if (isBuyerOnly) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          정산 계좌 정보
        </Typography>
        <Alert severity="info">
          판매자 등록을 완료하면 정산 계좌 정보를 관리할 수 있습니다.
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        정산 계좌 정보
      </Typography>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

      <List>
        <ListItem>
          <ListItemText
            primary="은행명"
            secondary={
              loading && !sellerInfo ? (
                <Skeleton width="60%" />
              ) : (
                sellerInfo?.bankName || "등록되지 않음"
              )
            }
          />
        </ListItem>

        <Divider />

        <ListItem>
          <ListItemText
            primary="계좌 번호"
            secondary={
              loading && !sellerInfo ? (
                <Skeleton width="60%" />
              ) : (
                sellerInfo?.bankAccount || "등록되지 않음"
              )
            }
          />
        </ListItem>
      </List>
      {!sellerInfo && (
        <Box sx={{ mt: 2 }}>
          <Button
            variant="contained"
            onClick={handleCreateAccount}
            disabled={loading}
          >
            정산 계좌 등록/갱신
          </Button>
        </Box>
      )}
    </Paper>
  );
};
