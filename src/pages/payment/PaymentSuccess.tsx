// pages/Payment/Success.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { depositApi } from "../../apis/depositApi";
export default function PaymentSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const approvePayment = async () => {
      const params = new URLSearchParams(window.location.search);
      const paymentKey = params.get("paymentKey");
      const orderId = params.get("orderId");
      const amountParam = params.get("amount");
      const amount = amountParam ? Number(amountParam) : NaN;

      if (!paymentKey || !orderId || Number.isNaN(amount)) {
        alert("결제 정보가 올바르지 않습니다.");
        return;
      }

      try {
        await depositApi.paymentSuccess({ paymentKey, orderId, amount });
        alert("결제가 완료되었습니다.");
        navigate("/mypage?tab=1", { replace: true });
      } catch (err) {
        alert("결제 승인에 실패하였습니다.");
        navigate("/mypage?tab=1", { replace: true });
      }
    };

    approvePayment();
  }, []);

  return <div>결제 처리 중...</div>;
}
