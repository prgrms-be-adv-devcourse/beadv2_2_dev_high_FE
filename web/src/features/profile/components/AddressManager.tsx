import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "@/apis/userApi";
import { useUserAddresses } from "@/hooks/useUserAddresses";
import { queryKeys } from "@/shared/queries/queryKeys";
import AddressFormDialog from "@/shared/components/AddressFormDialog";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";
import type { UserAddress, UserAddressCreateRequest } from "@moreauction/types";
import { useAuth } from "@moreauction/auth";

const mergeUpdatedAddress = (
  prev: UserAddress[] | undefined,
  updated: UserAddress
) => {
  const list = prev ?? [];
  const hasItem = list.some((item) => item.id === updated.id);
  const next = list.map((item) => {
    if (item.id === updated.id) return updated;
    if (updated.isDefault) return { ...item, isDefault: false };
    return item;
  });
  if (hasItem) return next;
  return updated.isDefault
    ? [updated, ...next.map((item) => ({ ...item, isDefault: false }))]
    : [updated, ...next];
};

const AddressManager: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const addressQuery = useUserAddresses(isAuthenticated);
  const addresses = addressQuery.data ?? [];
  const maxAddressCount = 10;
  const isAddressLimitReached = addresses.length >= maxAddressCount;
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<UserAddress | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const hasDefault = addresses.some((address) => address.isDefault);
  const shouldForceDefault =
    !editTarget && (addresses.length === 0 || !hasDefault);

  const createMutation = useMutation({
    mutationFn: (payload: UserAddressCreateRequest) =>
      userApi.createAddress(payload),
    onSuccess: (response) => {
      if (response?.data) {
        queryClient.setQueryData(
          queryKeys.user.addresses(),
          (prev: UserAddress[] | undefined) =>
            mergeUpdatedAddress(prev, response.data)
        );
      }
      setFormError(null);
      setDialogOpen(false);
      setEditTarget(null);
    },
    onError: () => {
      setFormError("주소지를 저장하지 못했습니다.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      addressId,
      payload,
    }: {
      addressId: string;
      payload: UserAddressCreateRequest;
    }) => userApi.modifyAddress(addressId, payload),
    onSuccess: (response) => {
      if (response?.data) {
        queryClient.setQueryData(
          queryKeys.user.addresses(),
          (prev: UserAddress[] | undefined) =>
            mergeUpdatedAddress(prev, response.data)
        );
      }
      setFormError(null);
      setDialogOpen(false);
      setEditTarget(null);
    },
    onError: () => {
      setFormError("주소지를 수정하지 못했습니다.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (address: UserAddress) => userApi.deleteAddress(address.id),
    onSuccess: (_, address) => {
      queryClient.setQueryData(
        queryKeys.user.addresses(),
        (prev: UserAddress[] | undefined) =>
          (prev ?? []).filter((item) => item.id !== address.id)
      );
      if (address.isDefault) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.user.addresses(),
        });
      }
    },
  });

  const openCreateDialog = () => {
    if (isAddressLimitReached) {
      setFormError("배송지는 최대 10개까지 등록할 수 있습니다.");
      return;
    }
    setEditTarget(null);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEditDialog = (address: UserAddress) => {
    setEditTarget(address);
    setFormError(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (createMutation.isPending || updateMutation.isPending) return;
    setDialogOpen(false);
    setEditTarget(null);
  };

  const handleSubmit = (values: UserAddressCreateRequest) => {
    if (editTarget) {
      updateMutation.mutate({ addressId: editTarget.id, payload: values });
      return;
    }
    createMutation.mutate(values);
  };

  const handleDelete = (address: UserAddress) => {
    if (deleteMutation.isPending) return;
    if (!window.confirm("주소지를 삭제하시겠습니까?")) return;
    deleteMutation.mutate(address);
  };

  const handleSetDefault = (address: UserAddress) => {
    if (updateMutation.isPending) return;
    updateMutation.mutate({
      addressId: address.id,
      payload: {
        city: address.city,
        state: address.state,
        zipcode: address.zipcode,
        detail: address.detail,
        isDefault: true,
      },
    });
  };

  React.useEffect(() => {
    const handleAddRequested = () => {
      openCreateDialog();
    };
    window.addEventListener("address:add-requested", handleAddRequested);
    return () => {
      window.removeEventListener("address:add-requested", handleAddRequested);
    };
  }, []);

  const listErrorMessage = React.useMemo(() => {
    if (!addressQuery.isError) return null;
    return getErrorMessage(
      addressQuery.error,
      "주소지 정보를 불러오지 못했습니다."
    );
  }, [addressQuery.error, addressQuery.isError]);

  return (
    <Box>
      <Box sx={{ mb: 2 }} />
      {isAddressLimitReached && (
        <Alert severity="info" sx={{ mb: 2 }}>
          배송지는 최대 10개까지 등록할 수 있습니다.
        </Alert>
      )}

      {addressQuery.isLoading ? (
        <Stack spacing={1.5}>
          {Array.from({ length: 2 }).map((_, idx) => (
            <Paper
              key={`address-skeleton-${idx}`}
              variant="outlined"
              sx={{ p: 2 }}
            >
              <Skeleton width="40%" />
              <Skeleton width="70%" />
              <Skeleton width="30%" />
            </Paper>
          ))}
        </Stack>
      ) : listErrorMessage ? (
        <Alert severity="error">{listErrorMessage}</Alert>
      ) : addresses.length === 0 ? (
        <Alert severity="info">등록된 주소지가 없습니다.</Alert>
      ) : (
        <Stack spacing={2}>
          {addresses.map((address) => (
            <Paper
              key={address.id}
              variant="outlined"
              sx={{ p: 2, borderRadius: 2 }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                spacing={2}
              >
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="subtitle1" fontWeight={700}>
                      {address.state} {address.city}
                    </Typography>
                    {address.isDefault && (
                      <Chip label="기본 배송지" color="primary" size="small" />
                    )}
                  </Stack>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {address.detail}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    우편번호 {address.zipcode}
                  </Typography>
                </Box>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  justifyContent={{ xs: "flex-start", sm: "flex-end" }}
                  flexWrap="wrap"
                >
                  {!address.isDefault && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleSetDefault(address)}
                      disabled={updateMutation.isPending}
                    >
                      기본 설정
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => openEditDialog(address)}
                  >
                    수정
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    variant="text"
                    onClick={() => handleDelete(address)}
                    disabled={deleteMutation.isPending}
                  >
                    삭제
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      <AddressFormDialog
        open={dialogOpen}
        title={editTarget ? "주소지 수정" : "주소지 등록"}
        submitLabel={editTarget ? "수정하기" : "등록하기"}
        loading={createMutation.isPending || updateMutation.isPending}
        initialValues={editTarget ?? undefined}
        forceDefault={shouldForceDefault}
        errorText={formError}
        onClose={handleCloseDialog}
        onSubmit={handleSubmit}
      />
    </Box>
  );
};

export default AddressManager;
