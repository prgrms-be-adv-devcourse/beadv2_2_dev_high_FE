import { Box, Container, Tab, Tabs, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { depositApi } from "../apis/depositApi";
import { orderApi } from "../apis/orderApi";
import { settlementApi } from "../apis/settlementApi";
import { productApi } from "../apis/productApi";
import { userApi } from "../apis/userApi";
import { requestTossPayment } from "../components/tossPay/requestTossPayment";
import { DepositChargeDialog } from "../components/mypage/DepositChargeDialog";
import { DepositHistoryTab } from "../components/mypage/DepositHistoryTab";
import { DepositSummaryTab } from "../components/mypage/DepositSummaryTab";
import { MyProductsTab } from "../components/mypage/MyProductsTab";
import { OrdersTab } from "../components/mypage/OrdersTab";
import { ProfileTab } from "../components/mypage/ProfileTab";
import { SettlementTab } from "../components/mypage/SettlementTab";
import { useAuth } from "../contexts/AuthContext";
import type { DepositHistory, DepositInfo } from "../types/deposit";
import type { OrderResponse } from "../types/order";
import type { Product } from "../types/product";
import { UserRole, type User } from "../types/user";
import type { SettlementResponse } from "../types/settlement";

const MyPage: React.FC = () => {
  const { user } = useAuth();
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [depositInfo, setDepositInfo] = useState<DepositInfo | null>(null);
  const [sellerInfo, setSellerInfo] = useState<{
    bankName?: string;
    bankAccount?: string;
  } | null>(null);
  const [settlementHistory, setSettlementHistory] = useState<
    SettlementResponse[]
  >([]);
  const [depositHistory, setDepositHistory] = useState<DepositHistory[]>([]);
  const [soldOrders, setSoldOrders] = useState<OrderResponse[]>([]);
  const [boughtOrders, setBoughtOrders] = useState<OrderResponse[]>([]);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openChargeDialog, setOpenChargeDialog] = useState(false); // 다이얼로그 오픈 상태
  const [chargeAmount, setChargeAmount] = useState<string>(""); // 충전 금액 입력 상태
  const [chargeError, setChargeError] = useState<string | null>(null); // 충전 금액 유효성 에러

  const params = new URLSearchParams(location.search);
  const initialTab = params.get("tab") ? Number(params.get("tab")) : 0;
  const [tabValue, setTabValue] = useState(initialTab);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  useEffect(() => {
    if (tabValue === 0) {
      loadUserProfile();
    }

    if (tabValue === 1) {
      // 예치금 탭
      loadDepositInfo();
      if (user?.role !== UserRole.USER) {
        loadSellerInfo();
      }
    } else if (tabValue === 2) {
      // 충전 내역 탭
      loadDepositHistory();
    } else if (tabValue === 3) {
      // 주문 내역 탭
      loadOrderHistory();
    } else if (tabValue === 4 && user?.role !== UserRole.USER) {
      // 정산 내역 탭
      loadSettlementHistory();
    } else if (tabValue === 5 && user?.role !== UserRole.USER) {
      // 내 상품 탭
      loadMyProducts();
    }
  }, [tabValue, user]);

  const loadUserProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await userApi.getMe();

      setUserInfo(data.data);
    } catch (err: any) {
      setError("유저 정보를 불러오는데 실패했습니다.");
      console.error("유저 조회 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadSellerInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await userApi.getSellerInfo();
      setSellerInfo(res.data);
    } catch (err: any) {
      // setError("계좌 정보를 불러오는데 실패했습니다.");
      console.error("계좌 조회 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadDepositInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await depositApi.getAccount();
      setDepositInfo(data);
    } catch (err: any) {
      // setError("예치금 정보를 불러오는데 실패했습니다.");
      console.error("예치금 조회 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadSettlementHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!user?.userId) {
        setSettlementHistory([]);
        return;
      }
      const res = await settlementApi.getSettlementHistory();
      setSettlementHistory(res.data);
    } catch (err: any) {
      setError("정산 내역을 불러오는데 실패했습니다.");
      console.error("정산 내역 조회 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMyProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await productApi.getMyProducts();
      setMyProducts(response.data);
    } catch (err: any) {
      setError("내 상품 정보를 불러오는데 실패했습니다.");
      console.error("내 상품 조회 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadDepositHistory = async () => {
    setLoading(true);
    setError(null);
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
      setError("충전 내역을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
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
        alert("생성성공");
      }
    } catch (err: any) {
      alert("생성실패:" + err?.data?.message);
    }
  };
  const handleChargeSubmit = async () => {
    if (loading) return;
    const amount = parseInt(chargeAmount, 10);

    if (isNaN(amount) || amount <= 0) {
      setChargeError("유효한 금액을 입력해주세요.");
      return;
    }

    setLoading(true);
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
      setLoading(false);
    }
  };

  const loadOrderHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const [soldRes, boughtRes] = await Promise.all([
        orderApi.getSoldOrders(),
        orderApi.getBoughtOrders(),
      ]);
      setSoldOrders(Array.isArray(soldRes.data) ? soldRes.data : []);
      setBoughtOrders(Array.isArray(boughtRes.data) ? boughtRes.data : []);
    } catch (err: any) {
      console.error("주문 내역 조회 실패:", err);
      setError("주문 내역을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
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
          <Tab label="예치금" />
          <Tab label="충전 내역" />
          <Tab label="주문 내역" />
          {user?.role !== "USER" && <Tab label="정산 내역" />}
          {user?.role !== "USER" && <Tab label="내 상품" />}
        </Tabs>
      </Box>
      <Box sx={{ mt: 3 }}>
        {tabValue === 0 && <ProfileTab userInfo={userInfo} role={user?.role} />}
        {tabValue === 1 && (
          <DepositSummaryTab
            loading={loading}
            error={error}
            depositInfo={depositInfo}
            sellerInfo={sellerInfo}
            role={user?.role}
            onCreateAccount={handleCreateAccount}
            onOpenChargeDialog={handleDepositCharge}
          />
        )}
        {tabValue === 2 && (
          <DepositHistoryTab
            loading={loading}
            error={error}
            history={depositHistory}
          />
        )}
        {tabValue === 3 && (
          <OrdersTab
            loading={loading}
            error={error}
            sold={soldOrders}
            bought={boughtOrders}
          />
        )}
        {tabValue === 4 && user?.role !== "USER" && (
          <SettlementTab
            loading={loading}
            error={error}
            settlementHistory={settlementHistory}
          />
        )}
        {tabValue === 5 && user?.role !== "USER" && (
          <MyProductsTab
            loading={loading}
            error={error}
            products={myProducts}
          />
        )}
      </Box>

      {/* 예치금 충전 다이얼로그 */}
      <DepositChargeDialog
        open={openChargeDialog}
        loading={loading}
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
