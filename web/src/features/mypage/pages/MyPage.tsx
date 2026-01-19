import { hasRole, UserRole } from "@moreauction/types";
import { Box, Container, Tab, Tabs, Typography } from "@mui/material";
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { DepositHistoryTab } from "@/features/mypage/components/DepositHistoryTab";
import { DepositSummaryTab } from "@/features/mypage/components/DepositSummaryTab";
import { MyProductsTab } from "@/features/mypage/components/MyProductsTab";
import { OrdersTab } from "@/features/mypage/components/OrdersTab";
import { SettlementTab } from "@/features/mypage/components/SettlementTab";
import { useAuth } from "@/contexts/AuthContext";

const MyPage: React.FC = () => {
  const { user } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);
  const initialTabParam = params.get("tab");
  const initialTab = initialTabParam ? Number(initialTabParam) : 0;
  const isSeller = hasRole(user?.roles, UserRole.SELLER);

  const maxTabIndex = isSeller ? 5 : 1;
  const safeInitialTab =
    Number.isFinite(initialTab) && initialTab >= 0 && initialTab <= maxTabIndex
      ? initialTab
      : 0;
  const [tabValue, setTabValue] = useState(safeInitialTab);

  useEffect(() => {
    const nextMax = isSeller ? 5 : 1;
    if (tabValue > nextMax) {
      setTabValue(0);
      const newParams = new URLSearchParams(location.search);
      newParams.set("tab", "0");
      navigate(`/mypage?${newParams.toString()}`, { replace: true });
    }
  }, [isSeller, tabValue, location.search, navigate]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="예치금 내역" />
          <Tab label="구매 내역" />
          {isSeller && <Tab label="판매 내역" />}
          {isSeller && <Tab label="정산 계좌" />}
          {isSeller && <Tab label="정산 내역" />}
          {isSeller && <Tab label="내 상품" />}
        </Tabs>
      </Box>
      <Box sx={{ mt: 3 }}>
        {tabValue === 0 && (
          <DepositHistoryTab />
        )}
        {tabValue === 1 && (
          <OrdersTab
            title="구매 내역"
            status="bought"
            emptyText="구매한 주문이 없습니다."
            showAdditionalPayment
          />
        )}
        {tabValue === 2 && isSeller && (
          <OrdersTab
            title="판매 내역"
            status="sold"
            emptyText="판매한 주문이 없습니다."
          />
        )}
        {tabValue === 3 && isSeller && (
          <DepositSummaryTab />
        )}
        {tabValue === 4 && isSeller && <SettlementTab />}
        {tabValue === 5 && isSeller && (
          <MyProductsTab />
        )}
      </Box>
    </Container>
  );
};

export default MyPage;
