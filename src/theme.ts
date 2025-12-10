import { createTheme, type ThemeOptions } from "@mui/material/styles";

const lightThemeOptions: ThemeOptions = {
  palette: {
    mode: "light",
    primary: {
      main: "#556cd6",
    },
    secondary: {
      main: "#19857b",
    },
    error: {
      main: "#ff1744",
    },
    background: {
      default: "#fff",
      paper: "#f5f5f5",
    },
  },
};

const darkThemeOptions: ThemeOptions = {
  palette: {
    mode: "dark",
    primary: {
      main: "#7986cb",
    },
    secondary: {
      main: "#4db6ac",
    },
    error: {
      main: "#ff4569",
    },
    background: {
      default: "#121212",
      paper: "#1e1e1e",
    },
  },
};

export const getTheme = (mode: "light" | "dark") =>
  createTheme(mode === "light" ? lightThemeOptions : darkThemeOptions);
