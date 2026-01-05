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
import { hasRole, UserRole, type UserRoles } from "@moreauction/types";

interface DepositSummaryTabProps {
  loading: boolean;
  error: string | null;
  sellerInfo: { bankName?: string; bankAccount?: string } | null;
  roles?: UserRoles;
  onCreateAccount: () => void;
}

export const DepositSummaryTab: React.FC<DepositSummaryTabProps> = ({
  loading,
  error,
  sellerInfo,
  roles,
  onCreateAccount,
}) => {
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

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
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
            onClick={onCreateAccount}
            disabled={loading}
          >
            정산 계좌 등록/갱신
          </Button>
        </Box>
      )}
    </Paper>
  );
};
