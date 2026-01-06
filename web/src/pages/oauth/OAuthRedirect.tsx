import { Box, CircularProgress, Typography } from "@mui/material";
import { useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { userApi } from "../../apis/userApi";
import { useAuth } from "../../contexts/AuthContext";
import type { SocialProvider } from "@moreauction/types";

const OAuthRedirect: React.FC<{ provider: SocialProvider }> = ({
  provider,
}) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const auth = useAuth();

  const code = searchParams.get("code");
  const state = searchParams.get("state") ?? undefined;
  const redirectTo = useMemo(() => {
    return sessionStorage.getItem("postLoginRedirect") || "/";
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!code) {
        navigate("/login", { replace: true });
        return;
      }

      if (provider === "naver") {
        const expectedState = localStorage.getItem("naver_oauth_state");
        if (!state || !expectedState || state !== expectedState) {
          console.error("네이버 OAuth state 불일치");
          navigate("/login", { replace: true });
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
        navigate("/login", { replace: true });
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
        소셜 로그인 처리 중...
      </Typography>
    </Box>
  );
};

export default OAuthRedirect;
