import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import type { UserAddress } from "@moreauction/types";

interface AddressManageDialogProps {
  open: boolean;
  onClose: () => void;
  onAddAddress: () => void;
  addresses: UserAddress[];
  isLoading: boolean;
  selectedAddressId: string | null;
  orderAddressUpdating: boolean;
  onSelectAddress: (address: UserAddress) => void;
  isAddressLimitReached: boolean;
}

const AddressManageDialog: React.FC<AddressManageDialogProps> = ({
  open,
  onClose,
  onAddAddress,
  addresses,
  isLoading,
  selectedAddressId,
  orderAddressUpdating,
  onSelectAddress,
  isAddressLimitReached,
}) => {
  const handleDialogClose = () => {
    if (orderAddressUpdating) return;
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      disableEscapeKeyDown={orderAddressUpdating}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>배송지 변경</DialogTitle>
      <DialogContent dividers>
        <Box
          sx={{
            mb: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            주문에 사용할 배송지를 선택하거나 주소지를 추가하세요.
          </Typography>
          <Button
            size="small"
            onClick={onAddAddress}
            disabled={isAddressLimitReached || orderAddressUpdating}
          >
            주소지 추가
          </Button>
        </Box>
        {isAddressLimitReached && (
          <Alert severity="info" sx={{ mb: 2 }}>
            배송지는 최대 10개까지 등록할 수 있습니다.
          </Alert>
        )}
        {isLoading ? (
          <Stack spacing={1}>
            <Skeleton width="40%" />
            <Skeleton width="70%" />
          </Stack>
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
                  spacing={1}
                >
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="subtitle2" fontWeight={700}>
                        {address.state} {address.city}
                      </Typography>
                      {address.isDefault && (
                        <Chip
                          label="기본 배송지"
                          color="primary"
                          size="small"
                        />
                      )}
                      {address.id === selectedAddressId && (
                        <Chip label="선택됨" size="small" />
                      )}
                    </Stack>
                    <Typography variant="body2">{address.detail}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      우편번호 {address.zipcode}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    {address.id !== selectedAddressId && (
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => onSelectAddress(address)}
                        disabled={orderAddressUpdating}
                      >
                        배송지 변경
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDialogClose} disabled={orderAddressUpdating}>
          닫기
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddressManageDialog;
