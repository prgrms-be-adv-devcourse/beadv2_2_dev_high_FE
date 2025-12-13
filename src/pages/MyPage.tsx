import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Tabs,
  Tab,
  Box,
  Button,
  CircularProgress,
  Alert,
} from "@mui/material";
import { useAuth } from "../contexts/AuthContext";
import { depositApi } from "../apis/depositApi";
import { productApi } from "../apis/productApi";
import type { DepositInfo } from "../types/deposit";
import type { Product } from "../types/product";

const MyPage: React.FC = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [depositInfo, setDepositInfo] = useState<DepositInfo | null>(null);
  const [settlementHistory, setSettlementHistory] = useState<any[]>([]);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  useEffect(() => {
    if (tabValue === 1 && user?.id) {
      // 예치금 탭
      loadDepositInfo();
    } else if (tabValue === 2 && user?.role !== "USER") {
      // 정산 내역 탭
      loadSettlementHistory();
    } else if (tabValue === 3 && user?.role !== "USER") {
      // 내 상품 탭
      loadMyProducts();
    }
  }, [tabValue, user]);

  const loadDepositInfo = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await depositApi.getAccount(user.id);
      setDepositInfo(data);
    } catch (err: any) {
      setError("예치금 정보를 불러오는데 실패했습니다.");
      console.error("예치금 조회 실패:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadSettlementHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      // 정산 내역 조회 API (추후 구현 예정)
      // 임시 데이터로 표시 (상품별 정산 내역)
      setSettlementHistory([
        {
          id: 1,
          date: "2024-12-01",
          productName: "아이폰 15",
          salePrice: 1200000,
          fee: 120000,
          netAmount: 1080000,
        },
        {
          id: 2,
          date: "2024-11-15",
          productName: "갤럭시 S24",
          salePrice: 1000000,
          fee: 100000,
          netAmount: 900000,
        },
      ]);
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

  const handleDepositCharge = () => {
    // 예치금 충전 로직 (추후 구현)
    alert("예치금 충전 기능은 추후 구현 예정입니다.");
  };

  const renderProfileTab = () => (
    <Paper>
      <List>
        <ListItem>
          <ListItemText
            primary="닉네임"
            secondary={user?.nickname || "정보 없음"}
          />
        </ListItem>
        <Divider />
        <ListItem>
          <ListItemText primary="이름" secondary={user?.name || "정보 없음"} />
        </ListItem>
        <Divider />
        <ListItem>
          <ListItemText
            primary="이메일"
            secondary={user?.email || "정보 없음"}
          />
        </ListItem>
        <Divider />
        <ListItem>
          <ListItemText primary="역할" secondary={user?.role || "정보 없음"} />
        </ListItem>
      </List>
    </Paper>
  );

  const renderDepositTab = () => (
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
            <Divider />
            <ListItem>
              <ListItemText
                primary="계좌 상태"
                secondary={depositInfo?.status || "정보 없음"}
              />
            </ListItem>
          </List>
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" onClick={handleDepositCharge}>
              예치금 충전
            </Button>
          </Box>
        </>
      )}
    </Paper>
  );

  const renderSettlementTab = () => (
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
                      primary={`${item.date} - ${item.productName}`}
                      secondary={`판매가: ${item.salePrice.toLocaleString()}원 | 수수료: ${item.fee.toLocaleString()}원 | 정산금: ${item.netAmount.toLocaleString()}원`}
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

  const renderMyProductsTab = () => (
    <Paper sx={{ p: 2 }}>
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <>
          <Typography variant="h6" sx={{ mb: 2 }}>
            내 상품 목록
          </Typography>
          {myProducts.length === 0 ? (
            <Typography>등록된 상품이 없습니다.</Typography>
          ) : (
            <List>
              {myProducts.map((product) => (
                <React.Fragment key={product.id}>
                  <ListItem>
                    <ListItemText
                      primary={product.name}
                      secondary={`가격: ${product.price?.toLocaleString()}원 | 상태: ${
                        product.status
                      }`}
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

  return (
    <Container maxWidth="md">
      <Typography variant="h4" sx={{ my: 4 }}>
        마이페이지
      </Typography>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="프로필" />
          <Tab label="예치금" />
          {user?.role !== "USER" && <Tab label="정산 내역" />}
          {user?.role !== "USER" && <Tab label="내 상품" />}
        </Tabs>
      </Box>
      <Box sx={{ mt: 3 }}>
        {tabValue === 0 && renderProfileTab()}
        {tabValue === 1 && renderDepositTab()}
        {tabValue === 2 && user?.role !== "USER" && renderSettlementTab()}
        {tabValue === 3 && user?.role !== "USER" && renderMyProductsTab()}
      </Box>
    </Container>
  );
};

export default MyPage;
