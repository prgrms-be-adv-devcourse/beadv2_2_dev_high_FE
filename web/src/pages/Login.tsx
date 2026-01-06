import {
  Box,
  Button,
  Divider,
  Grid,
  Link as MuiLink,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import React, { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { userApi } from "../apis/userApi"; // LoginParams import
import FormContainer from "../components/FormContainer";
import { useAuth } from "../contexts/AuthContext";
import type { LoginParams, LoginResponse } from "@moreauction/types";

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
  const theme = useTheme();
  const naverButtonImage =
    theme.palette.mode === "dark"
      ? "/images/NAVER_login_Dark_KR_green_center_H56.png"
      : "/images/NAVER_login_Light_KR_green_center_H56.png";
  const popupRef = useRef<Window | null>(null);

  const generateState = () => {
    const array = new Uint32Array(8);
    window.crypto.getRandomValues(array);
    return Array.from(array, (v) => v.toString(16)).join("");
  };

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as
    | string
    | undefined;
  const naverClientId = import.meta.env.VITE_NAVER_CLIENT_ID as
    | string
    | undefined;
  const googleRedirectUrl =
    (import.meta.env.VITE_GOOGLE_REDIRECT_URL as string | undefined) ??
    `${window.location.origin}/oauth/google/redirect`;
  const naverRedirectUrl =
    (import.meta.env.VITE_NAVER_REDIRECT_URL as string | undefined) ??
    `${window.location.origin}/oauth/naver/redirect`;

  const handleSocialRedirect = (provider: "google" | "naver") => {
    sessionStorage.setItem("postLoginRedirect", "/");
    if (provider === "google") {
      if (!googleClientId) {
        alert("구글 클라이언트 ID가 설정되지 않았습니다.");
        return;
      }
      const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      url.searchParams.set("client_id", googleClientId);
      url.searchParams.set("redirect_uri", googleRedirectUrl);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", "openid email profile");
      popupRef.current = window.open(
        url.toString(),
        "oauthLogin",
        "width=520,height=700,scrollbars=yes"
      );
      return;
    }

    if (!naverClientId) {
      alert("네이버 클라이언트 ID가 설정되지 않았습니다.");
      return;
    }
    const state = generateState();
    localStorage.setItem("naver_oauth_state", state);
    const url = new URL("https://nid.naver.com/oauth2.0/authorize");
    url.searchParams.set("client_id", naverClientId);
    url.searchParams.set("redirect_uri", naverRedirectUrl);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);
    popupRef.current = window.open(
      url.toString(),
      "oauthLogin",
      "width=520,height=700,scrollbars=yes"
    );
  };

  const loginMutation = useMutation({
    mutationFn: (payload: LoginParams) => userApi.login(payload),
    onSuccess: (response) => {
      const res = response.data;
      auth.login(res as LoginResponse);
      alert("로그인 성공!");
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

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; payload?: LoginResponse };
      if (data?.type !== "oauth:success" || !data.payload) return;
      auth.login(data.payload);
      sessionStorage.removeItem("postLoginRedirect");
      localStorage.removeItem("naver_oauth_state");
      popupRef.current?.close();
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [auth]);

  return (
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
      <Divider sx={{ my: 2 }}>
        <Typography variant="caption" color="text.secondary">
          또는
        </Typography>
      </Divider>
      <Stack spacing={1.5} sx={{ mb: 2 }}>
        <Box
          component="button"
          type="button"
          onClick={() => handleSocialRedirect("google")}
          sx={{
            position: "relative",
            width: "100%",
            height: 56,
            borderRadius: 1.5,
            border: "1px solid",
            borderColor:
              theme.palette.mode === "dark" ? "grey.700" : "grey.400",
            bgcolor:
              theme.palette.mode === "dark" ? "grey.900" : "grey.200",
            color: theme.palette.mode === "dark" ? "grey.100" : "grey.900",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            px: 2.5,
            fontFamily: "Roboto, Arial, sans-serif",
            fontSize: 14,
            fontWeight: 500,
            letterSpacing: "0.25px",
            outline: "none",
            overflow: "hidden",
            boxShadow: "none",
            "&:hover::after": {
              opacity: 0.08,
            },
            "&:active::after": {
              opacity: 0.12,
            },
            "&:hover": {
              boxShadow:
                "0 1px 2px 0 rgba(60, 64, 67, 0.3), 0 1px 3px 1px rgba(60, 64, 67, 0.15)",
            },
            "&::after": {
              content: '""',
              position: "absolute",
              inset: 0,
              bgcolor: theme.palette.mode === "dark" ? "grey.100" : "#001d35",
              opacity: 0,
              transition: "opacity 0.2s ease",
            },
          }}
          aria-label="Sign in with Google"
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              gap: 1.5,
              zIndex: 1,
            }}
          >
            <Box
              sx={{
                width: 20,
                height: 20,
                minWidth: 20,
              }}
            >
              <svg
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 48 48"
                style={{ display: "block", width: "100%", height: "100%" }}
              >
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
                <path fill="none" d="M0 0h48v48H0z" />
              </svg>
            </Box>
            <Typography component="span">Google 로그인</Typography>
          </Box>
        </Box>
        <Button
          fullWidth
          onClick={() => handleSocialRedirect("naver")}
          sx={{
            p: 0,
            minHeight: 56,
            borderRadius: 1.5,
            border: "1px solid",
            borderColor:
              theme.palette.mode === "dark" ? "grey.700" : "grey.300",
            bgcolor:
              theme.palette.mode === "dark" ? "grey.900" : "common.white",
            overflow: "hidden",
            "&:hover": {
              opacity: 0.92,
            },
          }}
          aria-label="네이버로 로그인"
        >
          <Box
            component="img"
            src={naverButtonImage}
            alt="네이버 로그인"
            sx={{
              width: "100%",
              height: 56,
              objectFit: "cover",
              display: "block",
            }}
          />
        </Button>
      </Stack>
      <Grid container>
        <Grid component="div">{/* TODO: 비밀번호 찾기 링크 */}</Grid>
        <Grid flex={1} textAlign="right">
          <MuiLink component={RouterLink} to="/signup" variant="body2">
            계정이 없으신가요? 회원가입
          </MuiLink>
        </Grid>
      </Grid>
    </FormContainer>
  );
};

export default Login;
