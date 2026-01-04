import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorOutline } from "@mui/icons-material";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Typography,
} from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { depositApi } from "../../apis/depositApi";

export default function PaymentFail() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("결제가 실패했어요");
  const [description, setDescription] = useState(
    "결제가 취소되었거나 실패했습니다. 예치금 잔액에 변동이 없는지 마이페이지에서 확인해 주세요."
  );
  const paymentFailMutation = useMutation({
    mutationFn: (payload: { orderId?: string; message?: string; code?: string }) =>
      depositApi.paymentFail(payload),
  });
  const loading = paymentFailMutation.isPending;

  useEffect(() => {
    const handleFail = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code") ?? undefined;
      const msg = params.get("message") ?? undefined;
      const orderId = params.get("orderId") ?? undefined;

      try {
        await paymentFailMutation.mutateAsync({ orderId, message: msg, code });
      } catch (err) {
        console.error("결제 실패 처리 중 오류:", err);
      } finally {
        sessionStorage.removeItem("autoPurchaseAfterCharge");
        sessionStorage.removeItem("autoAuctionDepositAfterCharge");
        setTitle("결제가 실패했어요");
        setDescription(
          msg ||
            "결제가 취소되었거나 실패했습니다. 예치금 잔액에 변동이 없는지 마이페이지에서 확인해 주세요."
        );
      }

      setTimeout(() => {
        navigate("/mypage?tab=1", { replace: true });
      }, 5000);
    };

    handleFail();
  }, [navigate, paymentFailMutation]);

  const handleGoMyPage = () => {
    navigate("/mypage?tab=1", { replace: true });
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
          {loading ? (
            <CircularProgress />
          ) : (
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
          잠시 후 마이페이지(예치금 탭)로 이동합니다.
        </Typography>
        <Button variant="contained" color="primary" onClick={handleGoMyPage}>
          마이페이지로 바로가기
        </Button>
      </Paper>
    </Container>
  );
}
