import {
  Alert,
  Button,
  Chip,
  Divider,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import type { UserAddress } from "@moreauction/types";

interface ShippingInfoCardProps {
  isUnpaid: boolean;
  onOpenAddressManage: () => void;
  addressLoading: boolean;
  displayAddress: UserAddress | null;
  isDefaultAddress: boolean;
  orderAddressId: string | null;
  canConfirmPurchase: boolean;
  onConfirmPurchase: () => void;
  actionLoading: boolean;
}

const ShippingInfoCard: React.FC<ShippingInfoCardProps> = ({
  isUnpaid,
  onOpenAddressManage,
  addressLoading,
  displayAddress,
  isDefaultAddress,
  orderAddressId,
  canConfirmPurchase,
  onConfirmPurchase,
  actionLoading,
}) => (
  <Paper
    variant="outlined"
    sx={{
      p: 2.5,
      borderRadius: 2,
      backgroundColor: "background.paper",
    }}
  >
    <Stack
      direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
      spacing={1}
    >
      <Typography variant="subtitle1" fontWeight={700}>
        배송지 정보
      </Typography>
      {isUnpaid && (
        <Button size="small" onClick={onOpenAddressManage}>
          배송지 변경
        </Button>
      )}
    </Stack>
    <Divider sx={{ my: 1.5 }} />
    {addressLoading ? (
      <Stack spacing={1}>
        <Skeleton width="40%" />
        <Skeleton width="70%" />
      </Stack>
    ) : displayAddress ? (
      <Stack spacing={0.5}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="subtitle2" fontWeight={700}>
            {displayAddress.state} {displayAddress.city}
          </Typography>
          {isDefaultAddress && (
            <Chip label="기본 배송지" color="primary" size="small" />
          )}
        </Stack>
        <Typography variant="body2">{displayAddress.detail}</Typography>
        <Typography variant="caption" color="text.secondary">
          우편번호 {displayAddress.zipcode}
        </Typography>
      </Stack>
    ) : (
      <Alert severity="info">
        {orderAddressId ? "배송지 정보를 찾을 수 없습니다." : "배송지 정보 없음"}
      </Alert>
    )}
    {canConfirmPurchase && (
      <>
        <Divider sx={{ my: 1.5 }} />
        <Button
          variant="contained"
          fullWidth
          onClick={onConfirmPurchase}
          disabled={actionLoading}
        >
          구매확정
        </Button>
      </>
    )}
  </Paper>
);

export default ShippingInfoCard;
