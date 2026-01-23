declare global {
  interface Window {
    TossPayments?: any;
  }
}

type RequestTossPaymentOptions = {
  successParams?: Record<string, string | number | null | undefined>;
};

export const requestTossPayment = (
  orderId: string,
  amount: number,
  orderName: string = "예치금 충전",
  options?: RequestTossPaymentOptions
) => {
  if (!window.TossPayments) {
    console.error("TossPayments SDK가 로드되지 않았습니다.");
    return;
  }
  const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY;
  const tossPayments = window.TossPayments(clientKey);
  const successUrl = new URL(
    `${window.location.origin}/payment/success`
  );
  const extraParams = options?.successParams ?? {};
  Object.entries(extraParams).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    successUrl.searchParams.set(key, String(value));
  });

  tossPayments.requestPayment("ALL", {
    amount,
    orderId,
    orderName,
    successUrl: successUrl.toString(),
    failUrl: `${window.location.origin}/payment/fail`,
  });
};
