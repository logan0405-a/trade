import React from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import useThemeStore from "./stores/theme";
import MainLayout from "./components/MainLayout";
import "./index.css";

function App() {
  const { theme } = useThemeStore();

  // 创建 MUI 主题
  const muiTheme = createTheme({
    palette: {
      mode: theme,
      primary: {
        main: "#3861FB",
      },
      secondary: {
        main: "#FF9A2F",
      },
      error: {
        main: "#F8575D",
      },
      success: {
        main: "#34C77B",
      },
      background: {
        default: theme === "dark" ? "#0A0E17" : "#F7F9FC",
        paper: theme === "dark" ? "#1E2329" : "#FFFFFF",
      },
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            borderRadius: 8,
          },
        },
      },
    },
  });

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <MainLayout />
    </ThemeProvider>
  );
}

export default App;
