import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import React from "react";
import DaumPostcode from "react-daum-postcode";
import type { UserAddressCreateRequest } from "@moreauction/types";

export interface AddressFormDialogProps {
  open: boolean;
  title?: string;
  submitLabel?: string;
  loading?: boolean;
  initialValues?: Partial<UserAddressCreateRequest>;
  forceDefault?: boolean;
  errorText?: string | null;
  onClose: () => void;
  onSubmit: (values: UserAddressCreateRequest) => void;
}

const buildInitialValues = (
  values?: Partial<UserAddressCreateRequest>,
  forceDefault?: boolean,
): UserAddressCreateRequest => ({
  city: values?.city ?? "",
  state: values?.state ?? "",
  zipcode: values?.zipcode ?? "",
  detail: values?.detail ?? "",
  isDefault: forceDefault ? true : (values?.isDefault ?? false),
});

const AddressFormDialog: React.FC<AddressFormDialogProps> = ({
  open,
  title = "주소지 등록",
  submitLabel = "저장하기",
  loading = false,
  initialValues,
  forceDefault = false,
  errorText,
  onClose,
  onSubmit,
}) => {
  const [values, setValues] = React.useState<UserAddressCreateRequest>(
    buildInitialValues(initialValues, forceDefault),
  );
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [postcodeOpen, setPostcodeOpen] = React.useState(false);
  const handleDialogClose = () => {
    if (loading) return;
    onClose();
  };

  React.useEffect(() => {
    if (!open) return;
    setValues(buildInitialValues(initialValues, forceDefault));
    setErrors({});
  }, [forceDefault, initialValues, open]);

  const handleChange =
    (field: keyof UserAddressCreateRequest) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue =
        field === "isDefault" ? event.target.checked : event.target.value;
      setValues((prev) => ({ ...prev, [field]: nextValue }));
      setErrors((prev) => ({ ...prev, [field]: "" }));
    };

  const handleSubmit = () => {
    const nextErrors: Record<string, string> = {};
    if (!values.state.trim()) nextErrors.state = "도/광역시를 입력해 주세요.";
    if (!values.city.trim()) nextErrors.city = "시/군/구를 입력해 주세요.";
    if (!values.zipcode.trim())
      nextErrors.zipcode = "우편번호를 입력해 주세요.";
    if (!values.detail.trim()) nextErrors.detail = "상세 주소를 입력해 주세요.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSubmit(values);
  };

  const handlePostcodeComplete = (data: {
    zonecode?: string;
    roadAddress?: string;
    jibunAddress?: string;
    address?: string;
    sido?: string;
    sigungu?: string;
  }) => {
    const resolvedAddress =
      data.roadAddress || data.jibunAddress || data.address || "";
    setValues((prev) => ({
      ...prev,
      zipcode: data.zonecode ?? prev.zipcode,
      state: data.sido ?? prev.state,
      city: data.sigungu ?? prev.city,
      detail: prev.detail.trim() ? prev.detail : resolvedAddress,
    }));
    setErrors((prev) => ({
      ...prev,
      state: "",
      city: "",
      zipcode: "",
    }));
    setPostcodeOpen(false);
  };

  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      disableEscapeKeyDown={loading}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            label="도/광역시"
            value={values.state}
            onChange={handleChange("state")}
            error={Boolean(errors.state)}
            helperText={errors.state || " "}
          />
          <TextField
            label="시/군/구"
            value={values.city}
            onChange={handleChange("city")}
            error={Boolean(errors.city)}
            helperText={errors.city || " "}
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              label="우편번호"
              value={values.zipcode}
              onChange={handleChange("zipcode")}
              error={Boolean(errors.zipcode)}
              helperText={errors.zipcode || " "}
              sx={{ flex: 1 }}
            />
            <Button
              variant="outlined"
              onClick={() => setPostcodeOpen(true)}
              sx={{ height: 56, minWidth: 140 }}
            >
              우편번호 검색
            </Button>
          </Stack>
          <TextField
            label="상세 주소"
            value={values.detail}
            onChange={handleChange("detail")}
            error={Boolean(errors.detail)}
            helperText={errors.detail || " "}
            multiline
            minRows={2}
          />
          <FormControlLabel
            control={
              <Switch
                checked={values.isDefault}
                onChange={handleChange("isDefault")}
                disabled={forceDefault}
              />
            }
            label="기본 배송지로 설정"
          />
          {forceDefault && (
            <Typography variant="caption" color="text.secondary">
              주문을 진행하려면 기본 배송지를 등록해야 합니다.
            </Typography>
          )}
          {errorText && <Alert severity="error">{errorText}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDialogClose} disabled={loading}>
          닫기
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? "저장 중..." : submitLabel}
        </Button>
      </DialogActions>
      <Dialog
        open={postcodeOpen}
        onClose={() => setPostcodeOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>우편번호 검색</DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          <DaumPostcode
            onComplete={handlePostcodeComplete}
            style={{ width: "100%", height: "520px" }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPostcodeOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default AddressFormDialog;
