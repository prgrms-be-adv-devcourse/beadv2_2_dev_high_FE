import { Box, Container, Tab, Tabs, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
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
import { ProfileTab } from "../components/mypage/ProfileTab";
import { SettlementTab } from "../components/mypage/SettlementTab";
import { requestTossPayment } from "../components/tossPay/requestTossPayment";
import { useAuth } from "../contexts/AuthContext";
import type { DepositHistory, DepositInfo } from "../types/deposit";
import type { OrderResponse } from "../types/order";
import type { ProductAndAuction } from "../types/product";
import { UserRole, type User } from "../types/user";

const MyPage: React.FC = () => {
  const { user } = useAuth();
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [depositInfo, setDepositInfo] = useState<DepositInfo | null>(null);
  const [sellerInfo, setSellerInfo] = useState<{
    bankName?: string;
    bankAccount?: string;
  } | null>(null);
  const [depositHistory, setDepositHistory] = useState<DepositHistory[]>([]);
  const [soldOrders, setSoldOrders] = useState<OrderResponse[]>([]);
  const [boughtOrders, setBoughtOrders] = useState<OrderResponse[]>([]);
  const [myProducts, setMyProducts] = useState<ProductAndAuction[]>([]);
  // 탭별 로딩/에러 상태 분리
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [depositInfoLoading, setDepositInfoLoading] = useState(false);
  const [depositInfoError, setDepositInfoError] = useState<string | null>(null);
  const [depositHistoryLoading, setDepositHistoryLoading] = useState(false);
  const [depositHistoryError, setDepositHistoryError] = useState<string | null>(
    null
  );
  const [sellerInfoLoaded, setSellerInfoLoaded] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [myProductsLoading, setMyProductsLoading] = useState(false);
  const [myProductsError, setMyProductsError] = useState<string | null>(null);
  const [sellerInfoLoading, setSellerInfoLoading] = useState(false);
  const [sellerInfoError, setSellerInfoError] = useState<string | null>(null);

  // 예치금 충전용 로딩
  const [chargeLoading, setChargeLoading] = useState(false);
  const [openChargeDialog, setOpenChargeDialog] = useState(false); // 다이얼로그 오픈 상태
  const [chargeAmount, setChargeAmount] = useState<string>(""); // 충전 금액 입력 상태
  const [chargeError, setChargeError] = useState<string | null>(null); // 충전 금액 유효성 에러

  const location = useLocation();
  const navigate = useNavigate();

  // 탭별 최초 로딩 여부 (한 번 불러온 데이터는 다시 탭을 눌렀을 때 재사용)
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [depositInfoLoaded, setDepositInfoLoaded] = useState(false);
  const [depositHistoryLoaded, setDepositHistoryLoaded] = useState(false);
  const [ordersLoaded, setOrdersLoaded] = useState(false);
  const [myProductsLoaded, setMyProductsLoaded] = useState(false);

  const params = new URLSearchParams(location.search);
  const initialTabParam = params.get("tab");
  const initialTab = initialTabParam ? Number(initialTabParam) : 0;
  const [tabValue, setTabValue] = useState(initialTab);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    const newParams = new URLSearchParams(location.search);
    newParams.set("tab", String(newValue));
    navigate(`/mypage?${newParams.toString()}`, { replace: true });
  };

  useEffect(() => {
    if (tabValue === 0 && !profileLoaded) {
      loadUserProfile();
    }
    if (tabValue === 1 && !depositInfoLoaded) {
      loadDepositInfo();
      loadDepositHistory();
    }
    if (tabValue === 2 && !ordersLoaded) {
      // 주문 내역 탭
      loadOrderHistory();
    }

    if (tabValue === 3 && user?.role !== UserRole.USER && !sellerInfoLoaded) {
      loadSellerInfo();
    } else if (
      tabValue === 4 &&
      user?.role !== UserRole.USER
    ) {
      // 정산 내역 탭 (SettlementTab 내부에서 조회)
    } else if (
      tabValue === 5 &&
      user?.role !== UserRole.USER &&
      !myProductsLoaded
    ) {
      // 내 상품 탭
      loadMyProducts();
    }
  }, [
    tabValue,
    user,
    profileLoaded,
    depositInfoLoaded,
    depositHistoryLoaded,
    ordersLoaded,
    myProductsLoaded,
    sellerInfoLoaded,
  ]);

  const loadUserProfile = async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const data = await userApi.getMe();

      setUserInfo(data.data);
    } catch (err: any) {
      setProfileError("유저 정보를 불러오는데 실패했습니다.");
      console.error("유저 조회 실패:", err);
    } finally {
      setProfileLoading(false);
      setProfileLoaded(true);
    }
  };

  const loadSellerInfo = async () => {
    setSellerInfoLoading(true);
    setSellerInfoError(null);
    try {
      const res = await userApi.getSellerInfo();
      setSellerInfo(res.data);
    } catch (err: any) {
      console.error("계좌 조회 실패:", err);
      setSellerInfoError("정산 계좌 정보를 불러오지 못했습니다.");
    } finally {
      setSellerInfoLoading(false);
      setSellerInfoLoaded(true);
    }
  };

  const loadDepositInfo = async () => {
    setDepositInfoLoading(true);
    setDepositInfoError(null);
    try {
      const data = await depositApi.getAccount();
      setDepositInfo(data);
    } catch (err: any) {
      console.error("예치금 조회 실패:", err);
      setDepositInfoError("예치금 정보를 불러오지 못했습니다.");
    } finally {
      setDepositInfoLoading(false);
      setDepositInfoLoaded(true);
    }
  };

  const loadMyProducts = async () => {
    setMyProductsLoading(true);
    setMyProductsError(null);
    try {
      const response = await productApi.getMyProducts(user?.userId);
      setMyProducts(response.data);
    } catch (err: any) {
      setMyProductsError("내 상품 정보를 불러오는데 실패했습니다.");
      console.error("내 상품 조회 실패:", err);
    } finally {
      setMyProductsLoading(false);
      setMyProductsLoaded(true);
    }
  };

  const loadDepositHistory = async () => {
    setDepositHistoryLoading(true);
    setDepositHistoryError(null);
    try {
      const page = await depositApi.getDepositHistories({
        page: 0,
        size: 50,
      });
      const content: DepositHistory[] = page?.content ?? [];
      // CHARGE / USAGE 전체를 저장하고, 화면에서 타입 필터링
      setDepositHistory(content);
    } catch (err: any) {
      console.error("충전 내역 조회 실패:", err);
      setDepositHistoryError("예치금 내역을 불러오는데 실패했습니다.");
    } finally {
      setDepositHistoryLoading(false);
      setDepositHistoryLoaded(true);
    }
  };

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
      if (res) {
        alert("예치금 계좌가 생성되었습니다.");
        await loadDepositInfo();
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

      if (depositOrder && depositOrder.orderId) {
        requestTossPayment(depositOrder.orderId, depositOrder.amount);
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

  const loadOrderHistory = async () => {
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const [soldRes, boughtRes] = await Promise.all([
        orderApi.getOrderByStatus("sold"),
        orderApi.getOrderByStatus("bought"),
      ]);
      setSoldOrders(Array.isArray(soldRes.data) ? soldRes.data : []);
      setBoughtOrders(Array.isArray(boughtRes.data) ? boughtRes.data : []);
    } catch (err: any) {
      console.error("주문 내역 조회 실패:", err);
      setOrdersError("주문 내역을 불러오는데 실패했습니다.");
    } finally {
      setOrdersLoading(false);
      setOrdersLoaded(true);
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
          {user?.role !== "USER" && <Tab label="정산 계좌" />}
          {user?.role !== "USER" && <Tab label="정산 내역" />}
          {user?.role !== "USER" && <Tab label="내 상품" />}
        </Tabs>
      </Box>
      <Box sx={{ mt: 3 }}>
        {tabValue === 0 && <ProfileTab userInfo={userInfo} role={user?.role} />}

        {tabValue === 1 && (
          <DepositHistoryTab
            loading={depositHistoryLoading}
            error={depositHistoryError}
            history={depositHistory}
            balanceInfo={depositInfo}
            balanceLoading={depositInfoLoading}
            balanceError={depositInfoError}
            onOpenChargeDialog={handleDepositCharge}
            onCreateAccount={handleCreateAccount}
          />
        )}
        {tabValue === 2 && (
          <OrdersTab
            loading={ordersLoading}
            error={ordersError}
            sold={soldOrders}
            bought={boughtOrders}
          />
        )}
        {tabValue === 3 && user?.role !== "USER" && (
          <DepositSummaryTab
            loading={sellerInfoLoading}
            error={sellerInfoError}
            sellerInfo={sellerInfo}
            role={user?.role}
            onCreateAccount={handleCreateAccount}
          />
        )}
        {tabValue === 4 && user?.role !== "USER" && (
          <SettlementTab />
        )}
        {tabValue === 5 && user?.role !== "USER" && (
          <MyProductsTab
            loading={myProductsLoading}
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
