import {
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import React from "react";
import type { SettlementResponse } from "../../types/settlement";

interface SettlementTabProps {
  loading: boolean;
  error: string | null;
  settlementHistory: SettlementResponse[];
}

export const SettlementTab: React.FC<SettlementTabProps> = ({
  loading,
  error,
  settlementHistory,
}) => {
  return (
    <Paper sx={{ p: 2 }}>
          {loading ? (
            <CircularProgress />
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : (
            <>
              <Typography variant="h6" sx={{ mb: 2 }}>
                정산 내역
              </Typography>
              {settlementHistory.length === 0 ? (
                <Typography>정산 내역이 없습니다.</Typography>
              ) : (
                <List>
                  {settlementHistory.map((item) => (
                    <React.Fragment key={item.id}>
                      <ListItem>
                        <ListItemText
                          primary={`${item.dueDate?.slice(
                            0,
                            10
                          )} - 주문 ID: ${item.orderId}`}
                          secondary={`낙찰가: ${item.winningAmount.toLocaleString()}원 | 수수료: ${item.charge.toLocaleString()}원 | 정산금: ${item.finalAmount.toLocaleString()}원`}
                        />
                      </ListItem>
                      <Divider />
                    </React.Fragment>
                  ))}
            </List>
          )}
        </>
      )}
    </Paper>
  );
};
