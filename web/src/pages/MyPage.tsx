import type {
  ApiResponseDto,
  DepositInfo,
  PagedDepositHistoryResponse,
  Product,
} from "@moreauction/types";
import { hasRole, UserRole } from "@moreauction/types";
import { Box, Container, Tab, Tabs, Typography } from "@mui/material";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { depositApi } from "../apis/depositApi";
import { orderApi } from "../apis/orderApi";
import { productApi } from "../apis/productApi";
import { userApi } from "../apis/userApi";
import { DepositChargeDialog } from "../components/mypage/DepositChargeDialog";
import { DepositHistoryTab } from "../components/mypage/DepositHistoryTab";
import { DepositSummaryTab } from "../components/mypage/DepositSummaryTab";
import { MyProductsTab } from "../components/mypage/MyProductsTab";
import { OrdersTab } from "../components/mypage/OrdersTab";
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

  const depositInfoQuery = useQuery<ApiResponseDto<DepositInfo>>({
    queryKey: ["deposit", "account"],
    queryFn: () => depositApi.getAccount(),
    enabled: tabValue === 0,
    staleTime: 30_000,
  });

  const depositHistoryQuery = useInfiniteQuery<
    PagedDepositHistoryResponse,
    Error
  >({
    queryKey: ["deposit", "history"],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await depositApi.getDepositHistories({
        page: pageParam as number,
        size: 20,
      });
      return response.data;
    },
    initialPageParam: 0,
    enabled: tabValue === 0,
    staleTime: 30_000,
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : (lastPage.number ?? 0) + 1,
  });

  const boughtOrdersQuery = useQuery({
    queryKey: ["orders", "history", "bought", user?.userId],
    queryFn: async () => {
      const boughtRes = await orderApi.getOrderByStatus("bought");
      return Array.isArray(boughtRes.data) ? boughtRes.data : [];
    },
    enabled: tabValue === 1,
    staleTime: 30_000,
  });

  const soldOrdersQuery = useQuery({
    queryKey: ["orders", "history", "sold", user?.userId],
    queryFn: async () => {
      const soldRes = await orderApi.getOrderByStatus("sold");
      return Array.isArray(soldRes.data) ? soldRes.data : [];
    },
    enabled: tabValue === 2 && hasRole(user?.roles, UserRole.SELLER),
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

  const depositInfo = depositInfoQuery.data?.data ?? null;
  const depositHistory =
    depositHistoryQuery.data?.pages.flatMap((page) => page.content ?? []) ?? [];
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
          <DepositHistoryTab
            loading={depositHistoryQuery.isLoading}
            loadingMore={depositHistoryQuery.isFetchingNextPage}
            error={depositHistoryError}
            history={depositHistory}
            balanceInfo={depositInfo}
            balanceLoading={depositInfoQuery.isLoading}
            balanceError={depositInfoError}
            onOpenChargeDialog={handleDepositCharge}
            onCreateAccount={handleCreateAccount}
            hasMore={!!depositHistoryQuery.hasNextPage}
            onLoadMore={() => depositHistoryQuery.fetchNextPage()}
          />
        )}
        {tabValue === 1 && (
          <OrdersTab
            title="구매 내역"
            loading={boughtOrdersQuery.isLoading}
            error={ordersBoughtError}
            orders={ordersBought}
            emptyText="구매한 주문이 없습니다."
            showAdditionalPayment
          />
        )}
        {tabValue === 2 && isSeller && (
          <OrdersTab
            title="판매 내역"
            loading={soldOrdersQuery.isLoading}
            error={ordersSoldError}
            orders={ordersSold}
            emptyText="판매한 주문이 없습니다."
          />
        )}
        {tabValue === 3 && isSeller && (
          <DepositSummaryTab
            loading={sellerInfoQuery.isLoading}
            error={sellerInfoError}
            sellerInfo={sellerInfo}
            roles={user?.roles}
            onCreateAccount={handleCreateAccount}
          />
        )}
        {tabValue === 4 && isSeller && <SettlementTab />}
        {tabValue === 5 && isSeller && (
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
