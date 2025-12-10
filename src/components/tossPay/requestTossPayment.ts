declare global {
  interface Window {
    TossPayments?: any;
  }
}

export const requestTossPayment = (
  orderId: string,
  amount: number,
  orderName: string = "예치금 충전"
) => {
  if (!window.TossPayments) {
    console.error("TossPayments SDK가 로드되지 않았습니다.");
    return;
  }
  const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY;
  const tossPayments = window.TossPayments(clientKey);

  tossPayments.requestPayment("ALL", {
    amount,
    orderId,
    orderName,
    successUrl: `${window.location.origin}/payment/success`,
    failUrl: `${window.location.origin}/payment/fail`,
  });
};
