import { hasRole, UserRole } from "@moreauction/types";
import { Box, Container, Tab, Tabs, Typography } from "@mui/material";
import React, { useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DepositHistoryTab } from "@/features/mypage/components/DepositHistoryTab";
import { DepositPaymentHistoryTab } from "@/features/mypage/components/DepositPaymentHistoryTab";
import { DepositSummaryTab } from "@/features/mypage/components/DepositSummaryTab";
import { AuctionParticipationTab } from "@/features/mypage/components/AuctionParticipationTab";
import { MyProductsTab } from "@/features/mypage/components/MyProductsTab";
import { OrdersTab } from "@/features/mypage/components/OrdersTab";
import { SettlementTab } from "@/features/mypage/components/SettlementTab";
import { useAuth } from "@/contexts/AuthContext";

const MyPage: React.FC = () => {
  const { user } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  const isSeller = hasRole(user?.roles, UserRole.SELLER);

  const maxTabIndex = isSeller ? 7 : 3;
  const parsedTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    return tabParam ? Number(tabParam) : 0;
  }, [location.search]);

  const safeTabValue =
    Number.isFinite(parsedTab) && parsedTab >= 0 && parsedTab <= maxTabIndex
      ? parsedTab
      : 0;

  useEffect(() => {
    if (safeTabValue === parsedTab) return;
    const newParams = new URLSearchParams(location.search);
    newParams.set("tab", String(safeTabValue));
    navigate(`/mypage?${newParams.toString()}`, { replace: true });
  }, [location.search, navigate, parsedTab, safeTabValue]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    const newParams = new URLSearchParams(location.search);
    newParams.set("tab", String(newValue));
    navigate(`/mypage?${newParams.toString()}`, { replace: true });
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" sx={{ my: 4 }}>
        마이페이지
      </Typography>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={safeTabValue} onChange={handleTabChange}>
          <Tab label="예치금 내역" />
          <Tab label="결제 내역" />
          <Tab label="구매 내역" />
          <Tab label="경매 참여 내역" />
          {isSeller && <Tab label="판매 내역" />}
          {isSeller && <Tab label="정산 계좌" />}
          {isSeller && <Tab label="정산 내역" />}
          {isSeller && <Tab label="내 상품" />}
        </Tabs>
      </Box>
      <Box sx={{ mt: 3 }}>
        {safeTabValue === 0 && (
          <DepositHistoryTab />
        )}
        {safeTabValue === 1 && (
          <DepositPaymentHistoryTab />
        )}
        {safeTabValue === 2 && (
          <OrdersTab
            title="구매 내역"
            status="bought"
            emptyText="구매한 주문이 없습니다."
            showAdditionalPayment
          />
        )}
        {safeTabValue === 3 && <AuctionParticipationTab />}
        {safeTabValue === 4 && isSeller && (
          <OrdersTab
            title="판매 내역"
            status="sold"
            emptyText="판매한 주문이 없습니다."
          />
        )}
        {safeTabValue === 5 && isSeller && (
          <DepositSummaryTab />
        )}
        {safeTabValue === 6 && isSeller && <SettlementTab />}
        {safeTabValue === 7 && isSeller && (
          <MyProductsTab />
        )}
      </Box>
    </Container>
  );
};

export default MyPage;
