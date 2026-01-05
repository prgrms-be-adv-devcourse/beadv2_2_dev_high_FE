import type {
  ApiResponseDto,
  DepositInfo,
  PagedDepositHistoryResponse,
  Product,
} from "@moreauction/types";
import { hasRole, UserRole } from "@moreauction/types";
import { Box, Container, Tab, Tabs, Typography } from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { depositApi } from "../apis/depositApi";
import { orderApi } from "../apis/orderApi";
import { productApi } from "../apis/productApi";
import { userApi } from "../apis/userApi";
import { DepositChargeDialog } from "../components/mypage/DepositChargeDialog";
import { DepositHistoryTab } from "../components/mypage/DepositHistoryTab";
import { DepositSummaryTab } from "../components/mypage/DepositSummaryTab";
import { MyProductsTab } from "../components/mypage/MyProductsTab";
import { OrdersTab, type OrderFilter } from "../components/mypage/OrdersTab";
import { ProfileTab } from "../components/mypage/ProfileTab";
import { SettlementTab } from "../components/mypage/SettlementTab";
import { requestTossPayment } from "../components/tossPay/requestTossPayment";
import { useAuth } from "../contexts/AuthContext";

const MyPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // 예치금 충전용 로딩
  const [chargeLoading, setChargeLoading] = useState(false);
  const [openChargeDialog, setOpenChargeDialog] = useState(false); // 다이얼로그 오픈 상태
  const [chargeAmount, setChargeAmount] = useState<string>(""); // 충전 금액 입력 상태
  const [chargeError, setChargeError] = useState<string | null>(null); // 충전 금액 유효성 에러

  const location = useLocation();
  const navigate = useNavigate();

  const params = new URLSearchParams(location.search);
  const initialTabParam = params.get("tab");
  const initialTab = initialTabParam ? Number(initialTabParam) : 0;
  const [tabValue, setTabValue] = useState(initialTab);
  const [ordersFilter, setOrdersFilter] = useState<OrderFilter>("BOUGHT");

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    const newParams = new URLSearchParams(location.search);
    newParams.set("tab", String(newValue));
    navigate(`/mypage?${newParams.toString()}`, { replace: true });
  };

  const profileQuery = useQuery({
    queryKey: ["user", "me"],
    queryFn: () => userApi.getMe(),
    enabled: tabValue === 0,
    staleTime: 60_000,
  });

  const depositInfoQuery = useQuery<ApiResponseDto<DepositInfo>>({
    queryKey: ["deposit", "account"],
    queryFn: () => depositApi.getAccount(),
    enabled: tabValue === 1,
    staleTime: 30_000,
  });

  const depositHistoryQuery = useQuery<
    ApiResponseDto<PagedDepositHistoryResponse>
  >({
    queryKey: ["deposit", "history"],
    queryFn: () =>
      depositApi.getDepositHistories({
        page: 0,
        size: 50,
      }),
    enabled: tabValue === 1,
    staleTime: 30_000,
  });

  const boughtOrdersQuery = useQuery({
    queryKey: ["orders", "history", "bought", user?.userId],
    queryFn: async () => {
      const boughtRes = await orderApi.getOrderByStatus("bought");
      return Array.isArray(boughtRes.data) ? boughtRes.data : [];
    },
    enabled: tabValue === 2 && ordersFilter === "BOUGHT",
    staleTime: 30_000,
  });

  const soldOrdersQuery = useQuery({
    queryKey: ["orders", "history", "sold", user?.userId],
    queryFn: async () => {
      const soldRes = await orderApi.getOrderByStatus("sold");
      return Array.isArray(soldRes.data) ? soldRes.data : [];
    },
    enabled:
      tabValue === 2 &&
      ordersFilter === "SOLD" &&
      hasRole(user?.roles, UserRole.SELLER),
    staleTime: 30_000,
  });

  const sellerInfoQuery = useQuery({
    queryKey: ["seller", "info"],
    queryFn: () => userApi.getSellerInfo(),
    enabled: tabValue === 3 && hasRole(user?.roles, UserRole.SELLER),
    staleTime: 60_000,
  });

  const myProductsQuery = useQuery({
    queryKey: ["products", "mine", user?.userId],
    queryFn: async () => {
      const response = await productApi.getMyProducts(user?.userId);
      return response.data as Product[];
    },
    enabled: tabValue === 5 && hasRole(user?.roles, UserRole.SELLER),
    staleTime: 30_000,
  });

  const userInfo = profileQuery.data?.data ?? null;
  const depositInfo = depositInfoQuery.data?.data ?? null;
  const depositHistory = depositHistoryQuery.data?.data?.content ?? [];
  const ordersBought = boughtOrdersQuery.data ?? [];
  const ordersSold = soldOrdersQuery.data ?? [];
  const sellerInfo = sellerInfoQuery.data?.data ?? null;
  const myProducts = myProductsQuery.data ?? [];

  const depositInfoError = useMemo(() => {
    if (!depositInfoQuery.isError) return null;
    const err: any = depositInfoQuery.error;
    return (
      err?.data?.message ?? err?.message ?? "예치금 정보를 불러오지 못했습니다."
    );
  }, [depositInfoQuery.error, depositInfoQuery.isError]);

  const depositHistoryError = useMemo(() => {
    if (!depositHistoryQuery.isError) return null;
    const err: any = depositHistoryQuery.error;
    return (
      err?.data?.message ??
      err?.message ??
      "예치금 내역을 불러오는데 실패했습니다."
    );
  }, [depositHistoryQuery.error, depositHistoryQuery.isError]);

  const ordersBoughtError = useMemo(() => {
    if (!boughtOrdersQuery.isError) return null;
    const err: any = boughtOrdersQuery.error;
    return (
      err?.data?.message ??
      err?.message ??
      "구매 내역을 불러오는데 실패했습니다."
    );
  }, [boughtOrdersQuery.error, boughtOrdersQuery.isError]);

  const ordersSoldError = useMemo(() => {
    if (!soldOrdersQuery.isError) return null;
    const err: any = soldOrdersQuery.error;
    return (
      err?.data?.message ??
      err?.message ??
      "판매 내역을 불러오는데 실패했습니다."
    );
  }, [soldOrdersQuery.error, soldOrdersQuery.isError]);

  const sellerInfoError = useMemo(() => {
    if (!sellerInfoQuery.isError) return null;
    const err: any = sellerInfoQuery.error;
    return (
      err?.data?.message ??
      err?.message ??
      "정산 계좌 정보를 불러오지 못했습니다."
    );
  }, [sellerInfoQuery.error, sellerInfoQuery.isError]);

  const myProductsError = useMemo(() => {
    if (!myProductsQuery.isError) return null;
    const err: any = myProductsQuery.error;
    return (
      err?.data?.message ??
      err?.message ??
      "내 상품 정보를 불러오는데 실패했습니다."
    );
  }, [myProductsQuery.error, myProductsQuery.isError]);

  const handleDepositCharge = () => {
    setOpenChargeDialog(true);
    setChargeError(null); // 에러 초기화
  };

  const handleCloseChargeDialog = () => {
    setOpenChargeDialog(false);
    setChargeAmount(""); // 금액 초기화
    setChargeError(null); // 에러 초기화
  };
  const handleCreateAccount = async () => {
    try {
      const res = await depositApi.createAccount(user?.userId);
      if (res?.data) {
        alert("예치금 계좌가 생성되었습니다.");
        queryClient.setQueryData(["deposit", "account"], res);
        if (typeof res.data.balance === "number") {
          queryClient.setQueryData(["deposit", "balance"], res.data.balance);
          localStorage.setItem("depositBalance", String(res.data.balance));
        }
        await queryClient.invalidateQueries({
          queryKey: ["deposit", "history"],
        });
      }
    } catch (err: any) {
      alert("계좌 생성 실패: " + (err?.data?.message ?? "알 수 없는 오류"));
    }
  };
  const handleChargeSubmit = async () => {
    if (chargeLoading) return;
    const amount = parseInt(chargeAmount, 10);

    if (isNaN(amount) || amount < 1000 || amount % 100 !== 0) {
      setChargeError("충전은 100원 단위로 최소 1,000원부터 가능합니다.");
      return;
    }

    setChargeLoading(true);
    setChargeError(null);

    try {
      const depositOrder = await depositApi.createDepositOrder(amount);

      if (depositOrder?.data?.orderId) {
        requestTossPayment(depositOrder.data.orderId, depositOrder.data.amount);
        handleCloseChargeDialog();
      } else {
        setChargeError("주문 생성에 실패했습니다.");
      }
    } catch (err: any) {
      console.error("예치금 충전 주문 생성 실패:", err);
      setChargeError("예치금 충전 주문 생성 중 오류가 발생했습니다.");
    } finally {
      setChargeLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" sx={{ my: 4 }}>
        마이페이지
      </Typography>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="프로필" />
          <Tab label="예치금 내역" />
          <Tab label="주문 내역" />
          {hasRole(user?.roles, UserRole.SELLER) && <Tab label="정산 계좌" />}
          {hasRole(user?.roles, UserRole.SELLER) && <Tab label="정산 내역" />}
          {hasRole(user?.roles, UserRole.SELLER) && <Tab label="내 상품" />}
        </Tabs>
      </Box>
      <Box sx={{ mt: 3 }}>
        {tabValue === 0 && (
          <ProfileTab userInfo={userInfo} roles={user?.roles} />
        )}

        {tabValue === 1 && (
          <DepositHistoryTab
            loading={depositHistoryQuery.isLoading}
            error={depositHistoryError}
            history={depositHistory}
            balanceInfo={depositInfo}
            balanceLoading={depositInfoQuery.isLoading}
            balanceError={depositInfoError}
            onOpenChargeDialog={handleDepositCharge}
            onCreateAccount={handleCreateAccount}
          />
        )}
        {tabValue === 2 && (
          <OrdersTab
            boughtLoading={boughtOrdersQuery.isLoading}
            soldLoading={soldOrdersQuery.isLoading}
            boughtError={ordersBoughtError}
            soldError={ordersSoldError}
            sold={ordersSold}
            bought={ordersBought}
            filter={ordersFilter}
            onFilterChange={(next) => setOrdersFilter(next)}
          />
        )}
        {tabValue === 3 && hasRole(user?.roles, UserRole.SELLER) && (
          <DepositSummaryTab
            loading={sellerInfoQuery.isLoading}
            error={sellerInfoError}
            sellerInfo={sellerInfo}
            roles={user?.roles}
            onCreateAccount={handleCreateAccount}
          />
        )}
        {tabValue === 4 && hasRole(user?.roles, UserRole.SELLER) && (
          <SettlementTab />
        )}
        {tabValue === 5 && hasRole(user?.roles, UserRole.SELLER) && (
          <MyProductsTab
            loading={myProductsQuery.isLoading}
            error={myProductsError}
            products={myProducts}
          />
        )}
      </Box>

      {/* 예치금 충전 다이얼로그 */}
      <DepositChargeDialog
        open={openChargeDialog}
        loading={chargeLoading}
        amount={chargeAmount}
        errorText={chargeError}
        onChangeAmount={setChargeAmount}
        onClose={handleCloseChargeDialog}
        onSubmit={handleChargeSubmit}
      />
    </Container>
  );
};

export default MyPage;
