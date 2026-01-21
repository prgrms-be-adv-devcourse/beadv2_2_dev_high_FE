import React from "react";
import { Container, Box, Typography } from "@mui/material";

interface FormContainerProps {
  title: string;
  children: React.ReactNode;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
}

/**
 * 로그인, 회원가입 등 폼을 감싸는 공통 레이아웃 컴포넌트
 * @param title - 폼 상단에 표시될 제목
 * @param children - 폼 내부에 들어갈 요소 (e.g., TextField, Button)
 * @param onSubmit - 폼 제출 시 호출될 함수
 * @param maxWidth - 폼의 최대 너비 (기본값: 'xs')
 */
const FormContainer: React.FC<FormContainerProps> = ({
  title,
  children,
  onSubmit,
  maxWidth = "xs",
}) => {
  return (
    <Container component="main" maxWidth={maxWidth}>
      <Box
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          maxWidth:
            maxWidth === false
              ? "none"
              : typeof maxWidth === "string"
              ? maxWidth
              : undefined,
        }}
      >
        <Typography component="h1" variant="h5">
          {title}
        </Typography>
        <Box component="form" onSubmit={onSubmit} noValidate sx={{ mt: 3 }}>
          {children}
        </Box>
      </Box>
    </Container>
  );
};

export default FormContainer;
