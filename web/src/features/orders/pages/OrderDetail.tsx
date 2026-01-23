import {
  Alert,
  Box,
  Chip,
  Container,
  Divider,
  Paper,
  Skeleton,
  Stack,
  Typography,
  Button,
} from "@mui/material";
import React, { useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orderApi } from "@/apis/orderApi";
import { depositApi } from "@/apis/depositApi";
import { userApi } from "@/apis/userApi";
import { useUserAddresses } from "@/hooks/useUserAddresses";
import AddressFormDialog from "@/shared/components/AddressFormDialog";
import { requestTossPayment } from "@/shared/utils/requestTossPayment";
import { useAuth } from "@moreauction/auth";
import {
  getOrderStatusLabel,
  OrderStatus,
  type OrderResponse,
  type UserAddress,
  type UserAddressCreateRequest,
} from "@moreauction/types";
import { queryKeys } from "@/shared/queries/queryKeys";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";
import OrderInfoCard from "@/features/orders/pages/OrderDetail/components/OrderInfoCard";
import PaymentSummaryCard from "@/features/orders/pages/OrderDetail/components/PaymentSummaryCard";
import ShippingInfoCard from "@/features/orders/pages/OrderDetail/components/ShippingInfoCard";
import AddressManageDialog from "@/features/orders/pages/OrderDetail/components/AddressManageDialog";
import PaymentDialog from "@/features/orders/pages/OrderDetail/components/PaymentDialog";
import PurchaseCancelDialog, {
  type CancelReason,
} from "@/features/orders/pages/OrderDetail/components/PurchaseCancelDialog";

const OrderDetail: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = React.useState(false);
  const [paidOverrideUntil, setPaidOverrideUntil] = React.useState<
    number | null
  >(null);
  const [paymentError, setPaymentError] = React.useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = React.useState(false);
  const [useDepositEnabled, setUseDepositEnabled] = React.useState(true);
  const [useDepositAll, setUseDepositAll] = React.useState(true);
  const [useDepositAmount, setUseDepositAmount] = React.useState("");
  const [addressDialogOpen, setAddressDialogOpen] = React.useState(false);
  const [addressCreateOpen, setAddressCreateOpen] = React.useState(false);
  const [addressManageOpen, setAddressManageOpen] = React.useState(false);
  const [selectedOrderAddressId, setSelectedOrderAddressId] = React.useState<
    string | null
  >(null);
  const [orderAddressUpdating, setOrderAddressUpdating] = React.useState(false);
  const [addressError, setAddressError] = React.useState<string | null>(null);
  const [pendingPaymentOpen, setPendingPaymentOpen] = React.useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState<CancelReason | "">("");
  const [cancelCustomReason, setCancelCustomReason] = React.useState("");
  const [cancelError, setCancelError] = React.useState<string | null>(null);
  const autoPayHandledRef = React.useRef(false);
  const orderQuery = useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: async () => {
      if (!orderId) throw new Error("주문 ID가 올바르지 않습니다.");
      const res = await orderApi.getOrderDetail(orderId);
      return res.data as OrderResponse;
    },
    enabled: !!orderId,
    staleTime: 30_000,
  });
  const depositAccountQuery = useQuery({
    queryKey: queryKeys.deposit.account(),
    queryFn: () => depositApi.getAccount(user?.userId),
    enabled: Boolean(user?.userId),
    staleTime: 30_000,
  });
  const addressQuery = useUserAddresses(Boolean(user?.userId));

  const errorMessage = useMemo(() => {
    if (!orderId) return "주문 ID가 올바르지 않습니다.";
    if (!orderQuery.isError) return null;
    return getErrorMessage(
      orderQuery.error,
      "주문 정보를 불러오지 못했습니다."
    );
  }, [orderId, orderQuery.error, orderQuery.isError]);

  const order = orderQuery.data ?? null;
  const orderDisplay = React.useMemo(() => {
    if (!order) return order;
    if (order.status !== OrderStatus.UNPAID) return order;
    if (!paidOverrideUntil) return order;
    if (Date.now() > paidOverrideUntil) return order;
    return {
      ...order,
      status: OrderStatus.PAID,
      payCompleteDate: order.payCompleteDate ?? new Date().toISOString(),
    };
  }, [order, paidOverrideUntil]);
  const isUnpaid = orderDisplay?.status === OrderStatus.UNPAID;
  const isBuyer = Boolean(
    user?.userId && orderDisplay?.buyerId === user?.userId
  );
  const isSeller = Boolean(
    user?.userId && orderDisplay?.sellerId === user?.userId
  );
  const isPayExpired = React.useMemo(() => {
    if (!orderDisplay?.payLimitDate) return false;
    const limitTime = new Date(orderDisplay.payLimitDate).getTime();
    return Number.isFinite(limitTime) && Date.now() > limitTime;
  }, [orderDisplay?.payLimitDate]);
  const purchaseOrderId = orderDisplay?.purchaseOrderId ?? null;
  const payableAmount =
    orderDisplay && typeof orderDisplay.depositAmount === "number"
      ? Math.max(orderDisplay.winningAmount - orderDisplay.depositAmount, 0)
      : orderDisplay?.winningAmount ?? 0;
  const depositBalance = depositAccountQuery.data?.data?.balance ?? 0;
  const purchaseOrderQuery = useQuery({
    queryKey: queryKeys.deposit.paymentOrder(purchaseOrderId),
    queryFn: () => depositApi.getPurchaseOrder(purchaseOrderId ?? ""),
    enabled: Boolean(purchaseOrderId),
    staleTime: 30_000,
  });
  const addresses = addressQuery.data ?? [];
  const maxAddressCount = 10;
  const isAddressLimitReached = addresses.length >= maxAddressCount;
  const defaultAddress = useMemo(
    () => addresses.find((item) => item.isDefault) ?? null,
    [addresses]
  );
  const hasDefaultAddress = Boolean(defaultAddress);
  const orderAddressId = orderDisplay?.addressId ?? null;
  const orderAddress = useMemo(() => {
    if (!orderAddressId) return null;
    return addresses.find((item) => item.id === orderAddressId) ?? null;
  }, [addresses, orderAddressId]);
  const selectedOrderAddress = useMemo(() => {
    if (!selectedOrderAddressId) return null;
    return addresses.find((item) => item.id === selectedOrderAddressId) ?? null;
  }, [addresses, selectedOrderAddressId]);
  const displayAddress = isUnpaid
    ? orderAddress ?? selectedOrderAddress ?? defaultAddress
    : orderAddress;

  const addressMutation = useMutation({
    mutationFn: (payload: UserAddressCreateRequest) =>
      userApi.createAddress(payload),
    onSuccess: (response) => {
      if (response?.data) {
        queryClient.setQueryData(
          queryKeys.user.addresses(),
          (prev: UserAddress[] | undefined) => {
            const next = (prev ?? []).map((item) =>
              response.data.isDefault ? { ...item, isDefault: false } : item
            );
            return [response.data, ...next];
          }
        );
      }
      setAddressError(null);
      setAddressDialogOpen(false);
      setAddressCreateOpen(false);
      if (pendingPaymentOpen) {
        setPendingPaymentOpen(false);
        setPaymentDialogOpen(true);
        setUseDepositEnabled(true);
        setUseDepositAll(true);
        setUseDepositAmount("");
        setPaymentError(null);
      }
    },
    onError: () => {
      setAddressError("주소지 등록에 실패했습니다.");
    },
  });

  const openPaymentDialog = React.useCallback(() => {
    setPaymentDialogOpen(true);
    setUseDepositEnabled(true);
    setUseDepositAll(true);
    setUseDepositAmount("");
    setPaymentError(null);
  }, []);

  const ensureDefaultAddress = React.useCallback(async () => {
    if (defaultAddress) return true;
    const refreshed = await addressQuery.refetch();
    const list = refreshed.data ?? addresses;
    if (list.some((item) => item.isDefault)) return true;
    setAddressDialogOpen(true);
    setPendingPaymentOpen(true);
    return false;
  }, [addressQuery, addresses, defaultAddress]);

  const resolveDefaultAddress = React.useCallback(async () => {
    if (defaultAddress) return defaultAddress;
    const refreshed = await addressQuery.refetch();
    const list = refreshed.data ?? addresses;
    return list.find((item) => item.isDefault) ?? null;
  }, [addressQuery, addresses, defaultAddress]);

  const updateOrderAddress = React.useCallback(
    async (addressId: string) => {
      if (!order?.id) return;
      const response = await orderApi.updateAddress(order.id, addressId);
      if (response?.data) {
        queryClient.setQueryData(
          queryKeys.orders.detail(order.id),
          response.data
        );
      }
    },
    [order?.id, queryClient]
  );

  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("pay") !== "1") return;
    if (!isBuyer) return;
    if (autoPayHandledRef.current) return;
    autoPayHandledRef.current = true;
    params.delete("pay");
    const nextSearch = params.toString();
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : "",
      },
      { replace: true }
    );
    const openAfterCheck = async () => {
      const canProceed = await ensureDefaultAddress();
      if (!canProceed) return;
      openPaymentDialog();
    };
    void openAfterCheck();
  }, [
    ensureDefaultAddress,
    location.pathname,
    location.search,
    navigate,
    openPaymentDialog,
  ]);

  const decrementDepositBalance = (amount: number) => {
    queryClient.setQueryData(
      queryKeys.deposit.balance(),
      (prev: number | undefined) => {
        const base = typeof prev === "number" ? prev : 0;
        const next = Math.max(base - amount, 0);
        localStorage.setItem("depositBalance", String(next));
        return next;
      }
    );
  };

  const handlePayWithDeposit = async () => {
    if (!order || !order.id || actionLoading) return;
    if (isPayExpired) {
      alert("결제 기한이 만료되었습니다.");
      return;
    }
    try {
      setActionLoading(true);
      const depositOrder = await depositApi.createOrderPayment({
        amount: payableAmount,
        deposit: payableAmount,
      });
      if (!depositOrder?.data?.id) {
        throw new Error("주문 생성에 실패했습니다.");
      }
      await depositApi.payOrderByDeposit({
        id: depositOrder.data.id,
        ...(order.id ? { winningOrderId: order.id } : {}),
      });
      decrementDepositBalance(payableAmount);
      setPaidOverrideUntil(Date.now() + 60_000);
      queryClient.setQueryData(
        queryKeys.orders.detail(order.id),
        (prev?: OrderResponse) =>
          prev
            ? {
                ...prev,
                status: OrderStatus.PAID,
                payCompleteDate: new Date().toISOString(),
              }
            : prev
      );
      queryClient.setQueryData(
        queryKeys.orders.pendingCount(),
        (prev: number | undefined) =>
          Math.max((typeof prev === "number" ? prev : 0) - 1, 0)
      );
      queryClient.setQueryData(
        queryKeys.orders.pending(user?.userId),
        (prev: OrderResponse[] | undefined) =>
          (prev ?? []).filter((item) => item.id !== order.id)
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.orders.pendings(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.orders.pending(user?.userId),
          refetchType: "none",
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.orders.histories(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.orders.detail(order.id),
          refetchType: "none",
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.deposit.account(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.deposit.historyAll(),
        }),
      ]);
      alert("결제가 완료되었습니다.");
    } catch (err: any) {
      console.error("예치금 결제 실패:", err);
      alert(err?.data?.message ?? "결제 처리 중 오류가 발생했습니다.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelPurchase = () => {
    if (!isBuyer) return;
    if (!order?.id || !purchaseOrderId || actionLoading) return;
    setCancelReason("");
    setCancelCustomReason("");
    setCancelError(null);
    setCancelDialogOpen(true);
  };

  const handleCloseCancelDialog = () => {
    if (actionLoading) return;
    setCancelDialogOpen(false);
  };

  const handleConfirmCancelPurchase = async () => {
    if (!isBuyer) return;
    if (!order?.id || !purchaseOrderId || actionLoading) return;
    const trimmedCustomReason = cancelCustomReason.trim();
    if (!cancelReason) {
      setCancelError("취소 사유를 선택해주세요.");
      return;
    }
    if (cancelReason === "기타(직접 입력)" && !trimmedCustomReason) {
      setCancelError("취소 사유를 입력해주세요.");
      return;
    }
    setCancelError(null);
    try {
      setActionLoading(true);
      await depositApi.canclePaymentOrders({
        id: purchaseOrderId,
        cancelReason:
          cancelReason === "기타(직접 입력)"
            ? trimmedCustomReason
            : cancelReason,
      });
      queryClient.setQueryData(
        queryKeys.orders.detail(order.id),
        (prev?: OrderResponse) =>
          prev
            ? { ...prev, status: OrderStatus.PAID_CANCEL }
            : prev
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.orders.detail(order.id),
          refetchType: "none",
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.orders.histories(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.deposit.account(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.deposit.historyAll(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.deposit.payments(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.deposit.paymentOrder(purchaseOrderId),
        }),
      ]);
      setCancelDialogOpen(false);
      alert("구매 취소가 접수되었습니다.");
    } catch (err: any) {
      console.error("구매 취소 실패:", err);
      setCancelError(
        err?.data?.message ?? "구매 취소 처리 중 오류가 발생했습니다."
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestRefund = () => {
    alert("환불 요청 기능은 준비 중입니다.");
  };

  const handleConfirmPurchase = () => {
    if (!isBuyer) return;
    if (orderDisplay?.status !== OrderStatus.SHIP_COMPLETED) return;
    const confirmed = window.confirm("구매를 확정하시겠습니까?");
    if (!confirmed) return;
    setActionLoading(true);
    const orderIdToUpdate = orderDisplay.id;
    orderApi
      .updateOrderStatus(orderIdToUpdate, OrderStatus.CONFIRM_BUY)
      .then((response) => {
        const nowIso = new Date().toISOString();
        const nextOrder =
          response?.data ??
          ({
            ...orderDisplay,
            status: OrderStatus.CONFIRM_BUY,
            confirmDate: orderDisplay.confirmDate ?? nowIso,
            updatedAt: nowIso,
          } as OrderResponse);
        queryClient.setQueryData(
          queryKeys.orders.detail(orderIdToUpdate),
          nextOrder
        );
        if (user?.userId) {
          queryClient.setQueryData(
            queryKeys.orders.history("bought", user.userId),
            (prev?: OrderResponse[]) => {
              if (!prev) return prev;
              return prev.map((order) =>
                order.id === orderIdToUpdate
                  ? {
                      ...order,
                      status: OrderStatus.CONFIRM_BUY,
                      confirmDate:
                        nextOrder.confirmDate ?? new Date().toISOString(),
                      updatedAt:
                        nextOrder.updatedAt ?? new Date().toISOString(),
                    }
                  : order
              );
            }
          );
        }
        return Promise.all([
          queryClient.invalidateQueries({
            queryKey: queryKeys.orders.histories(),
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.orders.detail(orderIdToUpdate),
            refetchType: "none",
          }),
        ]);
      })
      .then(() => {
        alert("구매확정이 완료되었습니다.");
      })
      .catch((err: any) => {
        console.error("구매확정 실패:", err);
        alert(err?.data?.message ?? "구매확정 처리 중 오류가 발생했습니다.");
      })
      .finally(() => {
        setActionLoading(false);
      });
  };

  const getDepositUsageAmount = () => {
    if (!useDepositEnabled) return 0;
    if (useDepositAll) {
      return Math.min(depositBalance, payableAmount);
    }
    const parsed = parseInt(useDepositAmount.replace(/,/g, ""), 10);
    if (Number.isNaN(parsed) || parsed <= 0) return 0;
    return Math.min(parsed, depositBalance, payableAmount);
  };

  const handleConfirmPayment = async () => {
    if (!order || !order.id || actionLoading) return;
    if (isPayExpired) {
      alert("결제 기한이 만료되었습니다.");
      return;
    }
    const canProceed = await ensureDefaultAddress();
    if (!canProceed) {
      setPaymentDialogOpen(false);
      return;
    }
    const addressToUse =
      selectedOrderAddress ?? orderAddress ?? (await resolveDefaultAddress());
    if (!addressToUse) {
      setPaymentDialogOpen(false);
      return;
    }
    const depositUsage = getDepositUsageAmount();
    const pgAmount = Math.max(payableAmount - depositUsage, 0);
    setPaymentError(null);
    try {
      if (!selectedOrderAddress && !orderAddressId) {
        await updateOrderAddress(addressToUse.id);
      }
      if (pgAmount <= 0) {
        await handlePayWithDeposit();
        setPaymentDialogOpen(false);
        return;
      }
      setActionLoading(true);
      const depositOrder = await depositApi.createOrderPayment({
        amount: payableAmount,
        deposit: depositUsage,
      });
      if (depositOrder?.data?.id) {
        sessionStorage.setItem(
          "paymentOrderContext",
          JSON.stringify({
            orderId: depositOrder.data.id,
            type: "order-payment",
            deposit: depositUsage,
            winningOrderId: order.id,
            createdAt: Date.now(),
          })
        );
        const paidAmount =
          depositOrder.data.paidAmount ?? depositOrder.data.amount;
        requestTossPayment(
          depositOrder.data.id,
          paidAmount,
          "주문 결제",
          {
            successParams: { winningOrderId: order.id },
          }
        );
        setPaymentDialogOpen(false);
      } else {
        throw new Error("주문 생성에 실패했습니다.");
      }
    } catch (chargeErr) {
      console.error("즉시 결제 요청 실패:", chargeErr);
      setPaymentError("즉시 결제 요청 중 오류가 발생했습니다.");
      alert("즉시 결제 요청 중 오류가 발생했습니다.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenPaymentDialog = async () => {
    if (!isBuyer) return;
    const canProceed = await ensureDefaultAddress();
    if (!canProceed) return;
    if (!orderAddressId) {
      const fallback = await resolveDefaultAddress();
      if (fallback) {
        await updateOrderAddress(fallback.id);
        setSelectedOrderAddressId(fallback.id);
      }
    }
    openPaymentDialog();
  };

  const handleClosePaymentDialog = () => {
    if (actionLoading) return;
    setPaymentDialogOpen(false);
  };

  const handleCloseAddressDialog = () => {
    if (addressMutation.isPending) return;
    setAddressDialogOpen(false);
    setAddressCreateOpen(false);
    setPendingPaymentOpen(false);
    setAddressError(null);
  };

  const handleOpenAddressManage = () => {
    if (!isBuyer) return;
    if (!isUnpaid) return;
    setSelectedOrderAddressId(orderAddressId ?? defaultAddress?.id ?? null);
    setAddressManageOpen(true);
  };

  const handleCloseAddressManage = () => {
    setAddressManageOpen(false);
  };

  const handleOpenAddressCreate = () => {
    if (!isBuyer) return;
    if (!isUnpaid) return;
    if (isAddressLimitReached) return;
    setAddressManageOpen(false);
    setAddressCreateOpen(true);
  };

  const handleSelectOrderAddress = (address: UserAddress) => {
    if (!isBuyer) return;
    setOrderAddressUpdating(true);
    setSelectedOrderAddressId(address.id);
    updateOrderAddress(address.id)
      .then(() => {
        setAddressManageOpen(false);
      })
      .finally(() => {
        setOrderAddressUpdating(false);
      });
  };

  const depositUsageAmount = getDepositUsageAmount();
  const pgAmount = Math.max(payableAmount - depositUsageAmount, 0);
  const isPaid = orderDisplay?.status === OrderStatus.PAID;
  const canCancelPurchase = Boolean(purchaseOrderId) && isPaid && isBuyer;
  const canRequestRefund =
    isBuyer &&
    (orderDisplay?.status === OrderStatus.SHIP_STARTED ||
      orderDisplay?.status === OrderStatus.SHIP_COMPLETED ||
      orderDisplay?.status === OrderStatus.CONFIRM_BUY);
  const confirmTime = orderDisplay?.updatedAt
    ? new Date(orderDisplay.updatedAt).getTime()
    : null;
  const isConfirmExpired =
    orderDisplay?.status === OrderStatus.CONFIRM_BUY &&
    confirmTime !== null &&
    Number.isFinite(confirmTime) &&
    Date.now() - confirmTime > 24 * 60 * 60 * 1000;
  const isRequestRefundDisabled =
    orderDisplay?.status === OrderStatus.CONFIRM_BUY && isConfirmExpired;
  const canConfirmPurchase =
    isBuyer && orderDisplay?.status === OrderStatus.SHIP_COMPLETED;
  const purchaseOrder = purchaseOrderQuery.data?.data ?? null;

  return (
    <Container maxWidth="md" sx={{ my: 4 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        spacing={1}
      >
        <Typography variant="h4">주문서</Typography>
        <Button onClick={() => navigate(-1)}>목록으로</Button>
      </Stack>
      <Paper
        sx={{
          mt: 3,
          p: { xs: 2, md: 3 },
          borderRadius: 3,
          backgroundColor: "rgba(148, 163, 184, 0.08)",
        }}
      >
        {orderQuery.isLoading ? (
          <Stack spacing={1}>
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="rectangular" height={200} />
          </Stack>
        ) : errorMessage ? (
          <Alert severity="error">{errorMessage}</Alert>
        ) : orderDisplay ? (
          <>
            <Stack spacing={2.5}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                spacing={1}
              >
                <Box>
                  <Typography variant="h6" sx={{ mb: 0.5, fontWeight: 700 }}>
                    {orderDisplay.productName ?? "주문"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    주문 ID · {orderDisplay.id}
                  </Typography>
                </Box>
                <Chip
                  label={getOrderStatusLabel(orderDisplay.status)}
                  color={
                    orderDisplay.status === OrderStatus.PAID
                      ? "success"
                      : orderDisplay.status === OrderStatus.UNPAID
                      ? "warning"
                      : "default"
                  }
                  variant="outlined"
                />
              </Stack>
              <Divider />

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" },
                  gap: 2,
                }}
              >
                <OrderInfoCard order={orderDisplay} showBuyerId />
                <PaymentSummaryCard
                  order={orderDisplay}
                  purchaseOrder={purchaseOrder}
                  payableAmount={payableAmount}
                  isPayExpired={isPayExpired}
                  isUnpaid={isBuyer && isUnpaid}
                  actionLoading={actionLoading}
                  onOpenPaymentDialog={handleOpenPaymentDialog}
                  canCancelPurchase={canCancelPurchase}
                  canRequestRefund={canRequestRefund}
                  onCancelPurchase={handleCancelPurchase}
                  onRequestRefund={handleRequestRefund}
                  isRequestRefundDisabled={isRequestRefundDisabled}
                />
              </Box>
              <ShippingInfoCard
                isUnpaid={isBuyer && isUnpaid}
                onOpenAddressManage={handleOpenAddressManage}
                addressLoading={addressQuery.isLoading}
                displayAddress={displayAddress}
                isDefaultAddress={
                  Boolean(displayAddress?.id) &&
                  displayAddress?.id === defaultAddress?.id
                }
                orderAddressId={orderAddressId}
                canConfirmPurchase={canConfirmPurchase}
                onConfirmPurchase={handleConfirmPurchase}
                actionLoading={actionLoading}
              />
            </Stack>
          </>
        ) : (
          <Alert severity="info">주문 정보를 찾을 수 없습니다.</Alert>
        )}
      </Paper>

      <AddressFormDialog
        open={addressDialogOpen}
        title="기본 배송지 등록"
        submitLabel="등록하고 결제하기"
        loading={addressMutation.isPending}
        forceDefault
        errorText={addressError}
        onClose={handleCloseAddressDialog}
        onSubmit={(values) => {
          addressMutation.mutate({ ...values, isDefault: true });
        }}
      />
      <AddressFormDialog
        open={addressCreateOpen}
        title="주소지 등록"
        submitLabel="등록하기"
        loading={addressMutation.isPending}
        forceDefault={!hasDefaultAddress}
        errorText={addressError}
        onClose={handleCloseAddressDialog}
        onSubmit={(values) => {
          addressMutation.mutate({
            ...values,
            isDefault: values.isDefault || !hasDefaultAddress,
          });
        }}
      />

      <AddressManageDialog
        open={addressManageOpen}
        onClose={handleCloseAddressManage}
        onAddAddress={handleOpenAddressCreate}
        addresses={addresses}
        isLoading={addressQuery.isLoading}
        selectedAddressId={selectedOrderAddressId}
        orderAddressUpdating={orderAddressUpdating}
        onSelectAddress={handleSelectOrderAddress}
        isAddressLimitReached={isAddressLimitReached}
      />

      <PaymentDialog
        open={paymentDialogOpen}
        onClose={handleClosePaymentDialog}
        onConfirm={handleConfirmPayment}
        actionLoading={actionLoading}
        paymentError={paymentError}
        payableAmount={payableAmount}
        payLimitDate={orderDisplay?.payLimitDate}
        depositBalance={depositBalance}
        useDepositEnabled={useDepositEnabled}
        useDepositAll={useDepositAll}
        useDepositAmount={useDepositAmount}
        onToggleUseDepositEnabled={(next) => {
          setUseDepositEnabled(next);
          if (!next) {
            setUseDepositAll(false);
            setUseDepositAmount("");
          }
        }}
        onToggleUseDepositAll={(next) => {
          setUseDepositAll(next);
          if (next) {
            setUseDepositAmount("");
          }
        }}
        onChangeDepositAmount={setUseDepositAmount}
        depositUsageAmount={depositUsageAmount}
        pgAmount={pgAmount}
      />

      <PurchaseCancelDialog
        open={cancelDialogOpen}
        loading={actionLoading}
        error={cancelError}
        selectedReason={cancelReason}
        customReason={cancelCustomReason}
        onChangeReason={(value) => {
          setCancelReason(value);
          setCancelError(null);
          if (value !== "기타(직접 입력)") {
            setCancelCustomReason("");
          }
        }}
        onChangeCustomReason={(value) => {
          setCancelCustomReason(value);
          setCancelError(null);
        }}
        onClose={handleCloseCancelDialog}
        onConfirm={handleConfirmCancelPurchase}
      />
    </Container>
  );
};

export default OrderDetail;
