import { Button, Grid, TextField, Typography } from "@mui/material";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { userApi } from "../apis/userApi"; // RegisterSellerParams import
import FormContainer from "../components/FormContainer";
import type { RegisterSellerParams } from "../types/user";

const SellerRegistration: React.FC = () => {
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      bankName: "",
      bankAccount: "",
    },
  });
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: RegisterSellerParams) => {
    if (loading) return;
    setLoading(true);
    try {
      // 실제 구현에서는 로그인된 사용자 정보를 함께 보내야 합니다.
      await userApi.registerSeller(data);
      alert("판매자 등록이 요청되었습니다. 관리자 승인 후 활동할 수 있습니다.");
      navigate("/");
    } catch (error) {
      console.error("판매자 등록 실패:", error);
      alert("판매자 등록 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormContainer
      title="판매자 등록"
      onSubmit={handleSubmit(onSubmit)}
      maxWidth="xs"
    >
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 1, mb: 2, textAlign: "center" }}
      >
        정산받으실 계좌 정보를 입력해주세요.
      </Typography>
      <Grid container spacing={2}>
        <Grid component="div" flexGrow={1}>
          <Controller
            name="bankName"
            control={control}
            rules={{ required: "은행명은 필수 항목입니다." }}
            render={({ field }) => (
              <TextField
                {...field}
                required
                fullWidth
                label="은행명"
                error={!!errors.bankName}
                helperText={errors.bankName?.message}
              />
            )}
          />
        </Grid>
        <Grid component="div" flexGrow={1}>
          <Controller
            name="bankAccount"
            control={control}
            rules={{ required: "계좌번호는 필수 항목입니다." }}
            render={({ field }) => (
              <TextField
                {...field}
                required
                fullWidth
                label="계좌번호"
                error={!!errors.bankAccount}
                helperText={errors.bankAccount?.message}
              />
            )}
          />
        </Grid>
      </Grid>
      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ mt: 3, mb: 2 }}
        disabled={loading}
      >
        {loading ? "요청 중..." : "판매자 등록 요청"}
      </Button>
    </FormContainer>
  );
};

export default SellerRegistration;
