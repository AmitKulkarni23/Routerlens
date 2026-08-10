import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#2d6a4f",
      light: "#52b788",
      dark: "#1b4332",
      contrastText: "#fff",
    },
    secondary: {
      main: "#495057",
    },
    background: {
      default: "#ffffff",
      paper: "#f8f9fa",
    },
    text: {
      primary: "#1a1a2e",
      secondary: "#5c5f6a",
    },
    error: {
      main: "#c1121f",
    },
    warning: {
      main: "#e36414",
    },
    success: {
      main: "#2d6a4f",
    },
    divider: "#e4e6ea",
  },
  typography: {
    fontFamily:
      "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    h4: {
      fontSize: "1.5rem",
      fontWeight: 600,
      letterSpacing: "-0.02em",
      lineHeight: 1.2,
    },
    h5: {
      fontSize: "1.25rem",
      fontWeight: 600,
      letterSpacing: "-0.01em",
      lineHeight: 1.3,
    },
    h6: {
      fontSize: "1rem",
      fontWeight: 600,
      lineHeight: 1.4,
    },
    body1: {
      fontSize: "0.9375rem",
      lineHeight: 1.6,
    },
    body2: {
      fontSize: "0.8125rem",
      lineHeight: 1.5,
    },
    caption: {
      fontSize: "0.75rem",
      lineHeight: 1.4,
      color: "#5c5f6a",
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundColor: "#ffffff",
          borderBottom: "1px solid #e4e6ea",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 500,
          fontSize: "0.875rem",
          minHeight: 56,
          color: "#5c5f6a",
          "&.Mui-selected": {
            color: "#1a1a2e",
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: "#2d6a4f",
          height: 2,
        },
      },
    },
    MuiCard: {
      defaultProps: {
        variant: "outlined",
      },
      styleOverrides: {
        root: {
          borderColor: "#e4e6ea",
          boxShadow: "none",
          "&:hover": {
            borderColor: "#ced4da",
          },
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          "& .MuiTableCell-head": {
            fontWeight: 600,
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            color: "#5c5f6a",
            borderBottomWidth: 2,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          fontSize: "0.75rem",
        },
      },
    },
  },
});

export default theme;
