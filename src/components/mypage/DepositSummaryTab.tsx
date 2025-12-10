import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import type { DepositInfo } from "../../types/deposit";
import type { UserRole } from "../../types/user";

interface DepositSummaryTabProps {
  loading: boolean;
  error: string | null;
  depositInfo: DepositInfo | null;
  sellerInfo: { bankName?: string; bankAccount?: string } | null;
  role?: UserRole;
  onCreateAccount: () => void;
  onOpenChargeDialog: () => void;
}

export const DepositSummaryTab: React.FC<DepositSummaryTabProps> = ({
  loading,
  error,
  depositInfo,
  sellerInfo,
  role,
  onCreateAccount,
  onOpenChargeDialog,
}) => {
  const isBuyerOnly = role === "USER";
  return (
    <Paper sx={{ p: 2 }}>
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <>
          <Typography variant="h6" sx={{ mb: 2 }}>
            예치금 정보
          </Typography>
          <List>
            <ListItem>
              <ListItemText
                primary="현재 잔액"
                secondary={`${depositInfo?.balance?.toLocaleString() || 0}원`}
              />
            </ListItem>
            {!isBuyerOnly && (
              <>
                <Divider />

                <ListItem>
                  <ListItemText
                    primary="은행명"
                    secondary={sellerInfo?.bankName || "정보 없음"}
                  />
                </ListItem>

                <Divider />

                <ListItem>
                  <ListItemText
                    primary="계좌 번호"
                    secondary={sellerInfo?.bankAccount || "정보 없음"}
                  />
                </ListItem>
              </>
            )}
          </List>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              onClick={onCreateAccount}
              sx={{ mr: 3 }}
            >
              예치금 계좌 생성
            </Button>
            <Button variant="contained" onClick={onOpenChargeDialog}>
              예치금 충전
            </Button>
          </Box>
        </>
      )}
    </Paper>
  );
};
