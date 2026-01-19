import { Box, CircularProgress, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { userApi } from "@/apis/userApi";
import { useAuth } from "@moreauction/auth";
import type { SocialProvider } from "@moreauction/types";

const OAuthRedirect: React.FC<{ provider: SocialProvider }> = ({
  provider,
}) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isPopup =
    typeof window !== "undefined" && !!window.opener && !window.opener.closed;

  const code = searchParams.get("code");
  const state = searchParams.get("state") ?? undefined;
  const redirectTo = useMemo(() => {
    return sessionStorage.getItem("postLoginRedirect") || "/";
  }, []);

  useEffect(() => {
    const closePopup = (message?: string) => {
      if (!isPopup) return;
      if (message) {
        setErrorMessage(message);
      }
      try {
        window.opener?.postMessage(
          { type: "oauth:failure", message },
          window.location.origin
        );
      } catch {
        // ignore postMessage failures
      }
      setTimeout(() => {
        window.close();
      }, 1200);
    };

    const handleFailure = (message: string) => {
      if (isPopup) {
        closePopup(message);
        return;
      }
      setErrorMessage(message);
      navigate("/login", { replace: true });
    };

    const run = async () => {
      if (!code) {
        handleFailure("소셜 로그인 코드가 누락되었습니다.");
        return;
      }

      if (provider === "naver") {
        const expectedState = localStorage.getItem("naver_oauth_state");
        if (!state || !expectedState || state !== expectedState) {
          console.error("네이버 OAuth state 불일치");
          handleFailure("소셜 로그인 검증에 실패했습니다.");
          return;
        }
      }

      try {
        const response = await userApi.socialLogin({
          provider,
          code,
          state,
        });
        if (window.opener) {
          window.opener.postMessage(
            { type: "oauth:success", payload: response.data },
            window.location.origin
          );
          localStorage.removeItem("naver_oauth_state");
          window.close();
          return;
        }
        auth.login(response.data);
        sessionStorage.removeItem("postLoginRedirect");
        localStorage.removeItem("naver_oauth_state");
        navigate(redirectTo, { replace: true });
      } catch (error) {
        console.error("소셜 로그인 실패:", error);
        handleFailure("소셜 로그인에 실패했습니다. 다시 시도해 주세요.");
      }
    };

    run();
  }, [auth, code, navigate, provider, redirectTo, state]);

  return (
    <Box
      sx={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
      }}
    >
      <CircularProgress />
      <Typography variant="body2" color="text.secondary">
        {errorMessage ? errorMessage : "소셜 로그인 처리 중..."}
      </Typography>
      {isPopup && errorMessage && (
        <Typography variant="caption" color="text.secondary">
          잠시 후 창이 자동으로 닫힙니다.
        </Typography>
      )}
    </Box>
  );
};

export default OAuthRedirect;
