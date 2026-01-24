import {
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
  Button,
} from "@mui/material";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { formatDate } from "@moreauction/utils";
import {
  getUserStatusLabel,
  SellerStatus,
  type AdminUser,
} from "@moreauction/types";
import {
  dialogContentSx,
  dialogPaperSx,
  dialogTitleSx,
} from "@/shared/components/dialogStyles";
import { adminDepositApi } from "@/apis/adminDepositApi";
import { useMutation } from "@tanstack/react-query";

type UserDetailDialogProps = {
  open: boolean;
  user: AdminUser | null;
  onClose: () => void;
  onExited: () => void;
};

const InfoRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
    <Typography
      variant="caption"
      color="text.secondary"
      component="div"
      sx={{ minWidth: 110 }}
    >
      {label}
    </Typography>
    <Typography variant="body2" component="div">
      {value}
    </Typography>
  </Box>
);

const UserDetailDialog = ({
  open,
  user,
  onClose,
  onExited,
}: UserDetailDialogProps) => {
  const [snapshot, setSnapshot] = useState<AdminUser | null>(null);
  const displayUser = snapshot ?? user;
  const deletedFlag = displayUser?.deletedYn === "Y";
  const depositCreateMutation = useMutation({
    mutationFn: (userId: string) =>
      adminDepositApi.createDepositAccount(userId),
    onSuccess: () => {
      alert("예치금 계좌가 생성되었습니다.");
    },
    onError: () => {
      alert("이미 예치금 계좌가 존재합니다.");
    },
  });

  const getSellerStatusLabel = (status?: SellerStatus | null) => {
    if (!status) return "-";
    const sellerStatusLabels: Record<SellerStatus, string> = {
      [SellerStatus.PENDING]: "미승인",
      [SellerStatus.ACTIVE]: "승인",
      [SellerStatus.INACTIVE]: "비활성",
      [SellerStatus.BLACKLISTED]: "블랙리스트",
      [SellerStatus.WITHDRAWN]: "탈퇴",
    };
    return sellerStatusLabels[status] ?? status;
  };

  useEffect(() => {
    if (open && user) {
      setSnapshot(user);
    }
  }, [open, user]);

  const handleExited = () => {
    setSnapshot(null);
    onExited();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: dialogPaperSx }}
      TransitionProps={{ onExited: handleExited }}
    >
      <DialogTitle sx={dialogTitleSx}>유저 상세</DialogTitle>
      <DialogContent dividers sx={dialogContentSx}>
        {displayUser ? (
          <Stack spacing={2}>
            <InfoRow label="유저 ID" value={displayUser.id ?? "-"} />
            <InfoRow label="이메일" value={displayUser.email ?? "-"} />
            <InfoRow label="이름" value={displayUser.name ?? "-"} />
            <InfoRow label="닉네임" value={displayUser.nickname ?? "-"} />
            <InfoRow label="전화번호" value={displayUser.phoneNumber ?? "-"} />
            <InfoRow label="OAuth" value={displayUser.provider ?? "-"} />
            <InfoRow
              label="회원 상태"
              value={
                <Chip
                  size="small"
                  label={getUserStatusLabel(displayUser.userStatus ?? "")}
                />
              }
            />
            <InfoRow
              label="판매자 상태"
              value={
                <Chip
                  size="small"
                  label={getSellerStatusLabel(displayUser.sellerStatus)}
                />
              }
            />
            <InfoRow
              label="정산 계좌"
              value={
                displayUser.bankName && displayUser.bankAccount
                  ? `${displayUser.bankName} ${displayUser.bankAccount}`
                  : "-"
              }
            />
            <InfoRow
              label="삭제 여부"
              value={
                <Chip
                  size="small"
                  label={deletedFlag ? "Y" : "N"}
                  color={deletedFlag ? "default" : "success"}
                  variant={deletedFlag ? "outlined" : "filled"}
                />
              }
            />
            <InfoRow
              label="가입일"
              value={
                displayUser.createdAt ? formatDate(displayUser.createdAt) : "-"
              }
            />
            <InfoRow
              label="수정일"
              value={
                displayUser.updatedAt ? formatDate(displayUser.updatedAt) : "-"
              }
            />
            <InfoRow
              label="삭제일"
              value={
                displayUser.deletedAt ? formatDate(displayUser.deletedAt) : "-"
              }
            />
            <InfoRow label="생성자" value={displayUser.createdBy ?? "-"} />
            <InfoRow label="수정자" value={displayUser.updatedBy ?? "-"} />
          </Stack>
        ) : (
          <Typography color="text.secondary">
            선택된 유저가 없습니다.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          variant="contained"
          onClick={() => {
            if (!displayUser?.id) return;
            depositCreateMutation.mutate(displayUser.id);
          }}
          disabled={!displayUser?.id || depositCreateMutation.isPending}
        >
          예치금 계좌 생성
        </Button>
        <Button onClick={onClose}>닫기</Button>
      </DialogActions>
    </Dialog>
  );
};

export default UserDetailDialog;
