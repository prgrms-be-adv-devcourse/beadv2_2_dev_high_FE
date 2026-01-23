// pages/PaymentSuccess.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useQueryClient } from "@tanstack/react-query";
import { auctionApi } from "@/apis/auctionApi";
import { depositApi } from "@/apis/depositApi";
import { queryKeys } from "@/shared/queries/queryKeys";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [title, setTitle] = useState("결제를 처리하고 있어요");
  const [description, setDescription] = useState(
    "결제 승인 중입니다. 잠시만 기다려 주세요.",
  );
  const [action, setAction] = useState<{ label: string; path: string }>({
    label: "마이페이지로 바로가기",
    path: "/mypage?tab=0",
  });
  const queryClient = useQueryClient();
  const paymentContext = useMemo(() => {
    const raw = sessionStorage.getItem("paymentOrderContext");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as {
        orderId?: string;
        type?: "deposit-charge" | "order-payment";
        deposit?: number;
        winningOrderId?: string;
      };
    } catch {
      return null;
    }
  }, []);

  const setDepositBalanceCache = useCallback(
    (next: number) => {
      queryClient.setQueryData(queryKeys.deposit.balance(), next);
      localStorage.setItem("depositBalance", String(next));
    },
    [queryClient],
  );

  const incrementDepositBalance = useCallback(
    (amount: number) => {
      queryClient.setQueryData(
        queryKeys.deposit.balance(),
        (prev: number | undefined) => {
          const base = typeof prev === "number" ? prev : 0;
          const next = Math.max(base + amount, 0);
          localStorage.setItem("depositBalance", String(next));
          return next;
        },
      );
    },
    [queryClient],
  );

  const decrementDepositBalance = useCallback(
    (amount: number) => {
      queryClient.setQueryData(
        queryKeys.deposit.balance(),
        (prev: number | undefined) => {
          const base = typeof prev === "number" ? prev : 0;
          const next = Math.max(base - amount, 0);
          localStorage.setItem("depositBalance", String(next));
          return next;
        },
      );
    },
    [queryClient],
  );

  const delay = (ms: number) =>
    new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });

  useEffect(() => {
    const approvePayment = async () => {
      let redirectPath = "/mypage?tab=0";
      const params = new URLSearchParams(window.location.search);
      const paymentKey = params.get("paymentKey");
      const orderId = params.get("orderId");
      const amountParam = params.get("amount");
      const winningOrderIdFromQuery =
        params.get("winningOrderId") ?? undefined;
      const amount = amountParam ? Number(amountParam) : NaN;
      const contextMatches = paymentContext?.orderId === orderId;
      const isOrderPayment =
        contextMatches && paymentContext?.type === "order-payment";
      const depositUsage =
        contextMatches && typeof paymentContext?.deposit === "number"
          ? paymentContext.deposit
          : 0;
      const winningOrderId =
        contextMatches && paymentContext?.winningOrderId
          ? paymentContext.winningOrderId
          : winningOrderIdFromQuery;

      if (!paymentKey || !orderId || Number.isNaN(amount)) {
        setStatus("error");
        setTitle("결제 정보를 확인할 수 없어요");
        setDescription(
          "결제 요청 정보가 올바르지 않습니다. 다시 시도해 주세요.",
        );
        return;
      }

      try {
        if (isOrderPayment && depositUsage > 0) {
          try {
            await depositApi.payOrderByDeposit({
              id: orderId,
              ...(winningOrderId ? { winningOrderId } : {}),
            });
            await Promise.all([
              queryClient.invalidateQueries({
                queryKey: queryKeys.deposit.account(),
              }),
              queryClient.invalidateQueries({
                queryKey: queryKeys.deposit.historyAll(),
              }),
            ]);
          } catch (depositErr: any) {
            await depositApi.paymentFail({
              orderId,
              message:
                depositErr?.response?.data?.message ??
                depositErr?.message ??
                "예치금 사용 처리에 실패했습니다.",
            });
            if (contextMatches) {
              sessionStorage.removeItem("paymentOrderContext");
            }
            setStatus("error");
            setTitle("예치금 사용 처리에 실패했어요");
            setDescription(
              "예치금 사용 처리에 실패했습니다. 잠시 후 다시 결제해 주세요."
            );
            setAction({
              label: "마이페이지로 바로가기",
              path: "/mypage?tab=0",
            });
            setTimeout(() => {
              navigate("/mypage?tab=0", { replace: true });
            }, 5000);
            return;
          }
        }

        await depositApi.paymentSuccess({
          paymentKey,
          orderId,
          amount,
          ...(winningOrderId ? { winningOrderId } : {}),
        });
        if (!isOrderPayment) {
          incrementDepositBalance(amount);
          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: queryKeys.deposit.account(),
            }),
            queryClient.invalidateQueries({
              queryKey: queryKeys.deposit.historyAll(),
            }),
          ]);
        }

        const autoAuctionRaw = sessionStorage.getItem(
          "autoAuctionDepositAfterCharge",
        );
        if (autoAuctionRaw && !isOrderPayment) {
          try {
            const parsed = JSON.parse(autoAuctionRaw) as {
              auctionId?: string;
              depositAmount?: number;
              createdAt?: number;
            };
            const targetAuctionId = parsed?.auctionId;
            const targetDepositAmount = parsed?.depositAmount;

            if (targetAuctionId && typeof targetDepositAmount === "number") {
              try {
                await delay(2500);
                await auctionApi.createParticipation(targetAuctionId, {
                  depositAmount: targetDepositAmount,
                });

                setTitle("충전과 보증금 납부가 완료됐어요");
                setDescription(
                  "예치금 충전 승인 후 보증금 결제까지 처리했습니다. 이제 입찰할 수 있어요.",
                );

                try {
                  const account = await depositApi.getAccount();
                  if (typeof account?.data?.balance === "number") {
                    setDepositBalanceCache(account.data.balance);
                  } else {
                    decrementDepositBalance(targetDepositAmount);
                  }
                } catch {
                  decrementDepositBalance(targetDepositAmount);
                }

                await Promise.all([
                  queryClient.invalidateQueries({
                    queryKey: queryKeys.auctions.detail(targetAuctionId),
                  }),
                  queryClient.invalidateQueries({
                    queryKey: queryKeys.auctions.participation(targetAuctionId),
                  }),
                ]);

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
                setTitle(
                  "충전은 완료됐지만 잔액 반영 전이에요. 잠시 후 다시 시도해 주세요",
                );
                setDescription(
                  "예치금 잔액 반영에 시간이 걸릴 수 있습니다. 잠시 후 경매 상세에서 보증금 납부를 다시 시도해 주세요.",
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

        if (contextMatches) {
          sessionStorage.removeItem("paymentOrderContext");
        }

        setStatus("success");
        if (isOrderPayment) {
          setTitle("결제가 완료되었어요");
          setDescription(
            "주문 결제가 완료되었습니다. 주문 내역을 확인해 주세요.",
          );
        } else {
          setTitle("충전이 완료되었어요");
          setDescription(
            "예치금이 충전되었습니다. 마이페이지에서 잔액과 내역을 확인할 수 있어요.",
          );
        }
        setAction({ label: "마이페이지로 바로가기", path: "/mypage?tab=0" });
      } catch (err) {
        if (contextMatches) {
          sessionStorage.removeItem("paymentOrderContext");
        }
        setStatus("error");
        setTitle("결제 승인에 실패했어요");
        setDescription(
          "결제가 정상적으로 승인되지 않았습니다. 결제 내역을 확인하거나 잠시 후 다시 시도해 주세요.",
        );
        setAction({ label: "마이페이지로 바로가기", path: "/mypage?tab=0" });
      }

      setTimeout(() => {
        navigate(redirectPath, { replace: true });
      }, 5000);
    };

    approvePayment();
  }, [
    decrementDepositBalance,
    incrementDepositBalance,
    navigate,
    paymentContext,
    queryClient,
    setDepositBalanceCache,
  ]);

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
        <Button
          variant="contained"
          color="primary"
          onClick={handleGo}
          disabled={status === "loading"}
        >
          {action.label}
        </Button>
      </Paper>
    </Container>
  );
}
