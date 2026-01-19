import { createTheme, type ThemeOptions } from "@mui/material/styles";

// 공통 테마 옵션: 타이포그래피, 라운딩, 컴포넌트 스타일 등
const baseThemeOptions: ThemeOptions = {
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily:
      "'Noto Sans KR', 'Roboto', 'Helvetica', 'Arial', sans-serif",
    h4: {
      fontWeight: 700,
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          transition: "background-color 200ms ease, color 200ms ease",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          transition:
            "transform 150ms ease, box-shadow 150ms ease, background-color 150ms ease",
          "&:hover": {
            transform: "translateY(-1px)",
            boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
          },
          "&:active": {
            transform: "translateY(0px) scale(0.99)",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
          transition: "transform 180ms ease, box-shadow 180ms ease",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: "0 18px 38px rgba(15, 23, 42, 0.12)",
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: "none",
        },
      },
    },
  },
};

const lightThemeOptions: ThemeOptions = {
  palette: {
    mode: "light",
    primary: {
      main: "#2563eb", // 약간 선명한 블루
    },
    secondary: {
      main: "#f97316", // 포인트용 오렌지
    },
    error: {
      main: "#ef4444",
    },
    background: {
      default: "#f3f4f6",
      paper: "#ffffff",
    },
  },
};

const darkThemeOptions: ThemeOptions = {
  palette: {
    mode: "dark",
    primary: {
      main: "#60a5fa",
    },
    secondary: {
      main: "#fb923c",
    },
    error: {
      main: "#f97373",
    },
    background: {
      default: "#020617",
      paper: "#020617",
    },
  },
};

export const getTheme = (mode: "light" | "dark") =>
  createTheme({
    ...baseThemeOptions,
    ...(mode === "light" ? lightThemeOptions : darkThemeOptions),
  });
