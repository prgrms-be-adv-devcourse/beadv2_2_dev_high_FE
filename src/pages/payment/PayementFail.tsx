import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { depositApi } from "../../apis/depositApi";

export default function PaymentFail() {
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
        await depositApi.paymentFail({ orderId });
        navigate("/mypage?tab=1");
      } catch (err) {
        alert("결제 승인에 실패하였습니다.");
        navigate("/mypage?tab=1");
      }
    };

    approvePayment();
  }, []);

  return <div>결제 실패 처리 중...</div>;
}
