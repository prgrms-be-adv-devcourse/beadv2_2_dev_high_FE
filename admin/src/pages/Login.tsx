import { Box, Button, Grid, TextField } from "@mui/material";
import React, { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { userApi } from "../apis/userApi";
import FormContainer from "../components/FormContainer";
import AdminShell from "../components/AdminShell";
import { useAuth } from "../contexts/AuthContext";
import { UserRole, type LoginParams, type LoginResponse } from "@moreauction/types";

const Login: React.FC = () => {
  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
  });
  const navigate = useNavigate();
  const auth = useAuth(); // useAuth 훅 사용

  const loginMutation = useMutation({
    mutationFn: (payload: LoginParams) => userApi.login(payload),
    onSuccess: (response) => {
      const res = response.data;
      const role = (res as LoginResponse).role;
      if (role !== UserRole.ADMIN) {
        alert("관리자 계정으로만 로그인할 수 있습니다.");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        auth.logout();
        return;
      }
      auth.login(res as LoginResponse);
      alert("관리자 로그인 성공!");
    },
    onError: (error) => {
      console.error("로그인 실패:", error);
      alert("로그인 중 오류가 발생했습니다. 이메일과 비밀번호를 확인해주세요.");
    },
  });

  const onSubmit = async (data: LoginParams) => {
    if (loginMutation.isPending) return;
    await loginMutation.mutateAsync(data);
  };

  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [auth.isAuthenticated, navigate]);

  return (
    <AdminShell headerTitle="Admin Console">
      <Box sx={{ mt: 2 }}>
        <FormContainer title="로그인" onSubmit={handleSubmit(onSubmit)}>
          <Controller
            name="email"
            control={control}
            rules={{
              required: "이메일은 필수 항목입니다.",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "유효한 이메일 주소를 입력해주세요.",
              },
            }}
            render={({ field }) => (
              <TextField
                {...field}
                margin="normal"
                required
                fullWidth
                label="이메일 주소"
                autoComplete="email"
                autoFocus
                error={!!errors.email}
                helperText={errors.email?.message}
              />
            )}
          />

          <Controller
            name="password"
            control={control}
            rules={{ required: "비밀번호는 필수 항목입니다." }}
            render={({ field }) => (
              <TextField
                {...field}
                margin="normal"
                required
                fullWidth
                label="비밀번호"
                type="password"
                autoComplete="current-password"
                error={!!errors.password}
                helperText={errors.password?.message}
              />
            )}
          />
          {/* TODO: '로그인 유지' 체크박스 추가 */}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "로그인 중..." : "로그인"}
          </Button>
          <Grid container>
            <Grid component="div" />
            <Grid flex={1} textAlign="right" />
          </Grid>
        </FormContainer>
      </Box>
    </AdminShell>
  );
};

export default Login;
