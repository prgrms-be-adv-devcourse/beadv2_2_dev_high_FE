// pages/payment/PaymentSuccess.tsx
import { use, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircleOutline, ErrorOutline } from "@mui/icons-material";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Typography,
} from "@mui/material";
import { auctionApi } from "../../apis/auctionApi";
import { depositApi } from "../../apis/depositApi";
import { useAuth } from "../../contexts/AuthContext";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const { user } = useAuth();
  const [title, setTitle] = useState("결제를 처리하고 있어요");
  const [description, setDescription] = useState(
    "결제 승인 중입니다. 잠시만 기다려 주세요."
  );
  const [action, setAction] = useState<{ label: string; path: string }>({
    label: "마이페이지로 바로가기",
    path: "/mypage?tab=1",
  });

  useEffect(() => {
    const approvePayment = async () => {
      let redirectPath = "/mypage?tab=1";
      const params = new URLSearchParams(window.location.search);
      const paymentKey = params.get("paymentKey");
      const orderId = params.get("orderId");
      const amountParam = params.get("amount");
      const amount = amountParam ? Number(amountParam) : NaN;

      if (!paymentKey || !orderId || Number.isNaN(amount)) {
        setStatus("error");
        setTitle("결제 정보를 확인할 수 없어요");
        setDescription(
          "결제 요청 정보가 올바르지 않습니다. 다시 시도해 주세요."
        );
        return;
      }

      try {
        await depositApi.paymentSuccess({ paymentKey, orderId, amount });
        window.dispatchEvent(
          new CustomEvent("deposit:increment", { detail: amount })
        );

        const autoPurchaseRaw = sessionStorage.getItem(
          "autoPurchaseAfterCharge"
        );
        if (autoPurchaseRaw) {
          try {
            const parsed = JSON.parse(autoPurchaseRaw) as {
              orderId?: string;
              amount?: number;
              createdAt?: number;
            };
            const purchaseOrderId = parsed?.orderId;
            const purchaseAmount = parsed?.amount;
            if (purchaseOrderId && typeof purchaseAmount === "number") {
              try {
                const info = await depositApi.createDeposit({
                  depositOrderId: purchaseOrderId,
                  amount: purchaseAmount,
                  type: "USAGE",
                  userId: user?.userId,
                });
                if (typeof info?.balance === "number") {
                  window.dispatchEvent(
                    new CustomEvent("deposit:set", { detail: info.balance })
                  );
                } else {
                  window.dispatchEvent(
                    new CustomEvent("deposit:decrement", {
                      detail: purchaseAmount,
                    })
                  );
                }
                window.dispatchEvent(
                  new CustomEvent("orders:pending-decrement", { detail: 1 })
                );
                window.dispatchEvent(new Event("orders:refresh"));
                redirectPath = "/orders";
                setStatus("success");
                setTitle("충전과 구매가 완료되었어요");
                setDescription(
                  "예치금 충전 승인 후 주문서 구매까지 처리했습니다. 주문 내역에서 확인할 수 있어요."
                );
                setAction({ label: "주문서로 바로가기", path: "/orders" });
              } catch (purchaseErr) {
                console.error("자동 구매 처리 실패:", purchaseErr);
                redirectPath = "/orders";
                setStatus("success");
                setTitle("충전은 완료됐지만 구매는 실패했어요");
                setDescription(
                  "예치금 충전은 완료됐지만 주문서 구매 처리에 실패했습니다. 주문서에서 다시 구매해 주세요."
                );
                setAction({ label: "주문서로 바로가기", path: "/orders" });
              } finally {
                sessionStorage.removeItem("autoPurchaseAfterCharge");
              }

              setTimeout(() => {
                navigate(redirectPath, { replace: true });
              }, 5000);
              return;
            }
          } catch (e) {
            console.error("autoPurchaseAfterCharge 파싱/처리 실패:", e);
          }
        }

        const autoAuctionRaw = sessionStorage.getItem(
          "autoAuctionDepositAfterCharge"
        );
        if (autoAuctionRaw) {
          try {
            const parsed = JSON.parse(autoAuctionRaw) as {
              auctionId?: string;
              depositAmount?: number;
              bidPrice?: number;
              createdAt?: number;
            };
            const targetAuctionId = parsed?.auctionId;
            const targetDepositAmount = parsed?.depositAmount;
            const targetBidPrice = parsed?.bidPrice;

            if (targetAuctionId && typeof targetDepositAmount === "number") {
              try {
                await auctionApi.createParticipation(targetAuctionId, {
                  depositAmount: targetDepositAmount,
                });

                if (typeof targetBidPrice === "number" && targetBidPrice > 0) {
                  try {
                    await auctionApi.placeBid(targetAuctionId, targetBidPrice);
                    setTitle("충전과 보증금 결제, 입찰까지 완료되었어요");
                    setDescription(
                      "예치금 충전 승인 후 보증금 결제와 입찰 접수까지 처리했습니다."
                    );
                  } catch (bidErr) {
                    console.error("자동 입찰 처리 실패:", bidErr);
                    setTitle("충전과 보증금 결제는 완료됐지만 입찰은 실패했어요");
                    setDescription(
                      "예치금 충전과 보증금 결제는 완료됐지만 입찰 접수에 실패했습니다. 경매 상세에서 다시 입찰해 주세요."
                    );
                  }
                } else {
                  setTitle("충전과 보증금 결제가 완료되었어요");
                  setDescription(
                    "예치금 충전 승인 후 보증금 결제까지 처리했습니다. 이제 입찰할 수 있어요."
                  );
                }

                try {
                  const account = await depositApi.getAccount();
                  if (typeof account?.balance === "number") {
                    window.dispatchEvent(
                      new CustomEvent("deposit:set", { detail: account.balance })
                    );
                  } else {
                    window.dispatchEvent(
                      new CustomEvent("deposit:decrement", {
                        detail: targetDepositAmount,
                      })
                    );
                  }
                } catch {
                  window.dispatchEvent(
                    new CustomEvent("deposit:decrement", {
                      detail: targetDepositAmount,
                    })
                  );
                }

                redirectPath = `/auctions/${targetAuctionId}`;
                setStatus("success");
                setAction({
                  label: "경매로 바로가기",
                  path: `/auctions/${targetAuctionId}`,
                });
              } catch (depositErr) {
                console.error("자동 보증금 결제 처리 실패:", depositErr);
                redirectPath = `/auctions/${targetAuctionId}`;
                setStatus("success");
                setTitle("충전은 완료됐지만 보증금 결제는 실패했어요");
                setDescription(
                  "예치금 충전은 완료됐지만 보증금 결제 처리에 실패했습니다. 경매 상세에서 다시 시도해 주세요."
                );
                setAction({
                  label: "경매로 바로가기",
                  path: `/auctions/${targetAuctionId}`,
                });
              } finally {
                sessionStorage.removeItem("autoAuctionDepositAfterCharge");
              }

              setTimeout(() => {
                navigate(redirectPath, { replace: true });
              }, 5000);
              return;
            }
          } catch (e) {
            console.error("autoAuctionDepositAfterCharge 파싱/처리 실패:", e);
          }
        }

        setStatus("success");
        setTitle("충전이 완료되었어요");
        setDescription(
          "예치금이 충전되었습니다. 마이페이지에서 잔액과 내역을 확인할 수 있어요."
        );
        setAction({ label: "마이페이지로 바로가기", path: "/mypage?tab=1" });
      } catch (err) {
        setStatus("error");
        setTitle("결제 승인에 실패했어요");
        setDescription(
          "결제가 정상적으로 승인되지 않았습니다. 결제 내역을 확인하거나 잠시 후 다시 시도해 주세요."
        );
        setAction({ label: "마이페이지로 바로가기", path: "/mypage?tab=1" });
      }

      setTimeout(() => {
        navigate(redirectPath, { replace: true });
      }, 5000);
    };

    approvePayment();
  }, [navigate]);

  const handleGo = () => {
    navigate(action.path, { replace: true });
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8, mb: 8 }}>
      <Paper
        elevation={3}
        sx={{
          p: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <Box sx={{ mb: 2 }}>
          {status === "loading" && <CircularProgress />}
          {status === "success" && (
            <CheckCircleOutline color="success" sx={{ fontSize: 48 }} />
          )}
          {status === "error" && (
            <ErrorOutline color="error" sx={{ fontSize: 48 }} />
          )}
        </Box>
        <Typography variant="h5" sx={{ mb: 1 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {description}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
          잠시 후 자동으로 이동합니다.
        </Typography>
        <Button variant="contained" color="primary" onClick={handleGo}>
          {action.label}
        </Button>
      </Paper>
    </Container>
  );
}
