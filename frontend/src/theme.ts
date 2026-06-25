import { createTheme } from "@mui/material/styles";

// OKLCH to hex approximations (implemented per DESIGN.md)
// bg: oklch(9% 0.008 250) → #0d0f13
// surface: oklch(12.5% 0.007 250) → #13161e
// surface-raised: oklch(16% 0.007 250) → #1a1f2e
// border: oklch(22% 0.005 250) → #282d3d
// ink: oklch(92% 0.005 250) → #eae8f0
// ink-muted: oklch(55% 0.005 250) → #717486
// ink-faint: oklch(36% 0.005 250) → #464d5d
// accent: oklch(62% 0.19 265) → #5e6ad2
// accent-muted: oklch(62% 0.08 265) → #5e6ad2 @ 30% opacity
// status-error: oklch(56% 0.18 25) → #d62828
// status-done: oklch(70% 0.15 160) → #2fa649

export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#5e6ad2", // accent color
      light: "#7a83e8",
      dark: "#4a55b8",
      contrastText: "#eae8f0",
    },
    secondary: {
      main: "#5e6ad2",
      light: "#7a83e8",
      dark: "#4a55b8",
      contrastText: "#eae8f0",
    },
    background: {
      default: "#0d0f13", // bg
      paper: "#13161e", // surface
    },
    divider: "#282d3d", // border
    text: {
      primary: "#eae8f0", // ink
      secondary: "#717486", // ink-muted
      disabled: "#464d5d", // ink-faint
    },
    success: {
      main: "#2fa649", // status-done
      contrastText: "#eae8f0",
    },
    error: {
      main: "#d62828", // status-error
      contrastText: "#eae8f0",
    },
    action: {
      hover: "#1a1f2e", // surface-raised @ hover
      selected: "#1a1f2e",
      disabled: "#464d5d",
      disabledBackground: "transparent",
    },
  },
  typography: {
    fontFamily: '"Geist", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: "clamp(2rem, 5vw, 3.5rem)",
      fontWeight: 700,
      lineHeight: 1.05,
      letterSpacing: "-0.03em",
      fontFamily: '"Geist", sans-serif',
    },
    h2: {
      fontSize: "1.5rem",
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: "-0.02em",
      fontFamily: '"Geist", sans-serif',
    },
    h3: {
      fontSize: "1rem",
      fontWeight: 500,
      lineHeight: 1.35,
      fontFamily: '"Geist", sans-serif',
    },
    h4: {
      fontSize: "0.9375rem",
      fontWeight: 500,
      lineHeight: 1.35,
      fontFamily: '"Geist", sans-serif',
    },
    h5: {
      fontSize: "0.75rem",
      fontWeight: 500,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
      fontFamily: '"Geist Mono", monospace',
    },
    h6: {
      fontSize: "0.75rem",
      fontWeight: 500,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
      fontFamily: '"Geist Mono", monospace',
    },
    body1: {
      fontSize: "0.9375rem",
      lineHeight: 1.6,
      fontFamily: '"Geist", sans-serif',
      fontWeight: 400,
    },
    body2: {
      fontSize: "0.875rem",
      lineHeight: 1.7,
      fontFamily: '"Geist Mono", monospace',
      fontWeight: 400,
    },
    caption: {
      fontSize: "0.75rem",
      lineHeight: 1.5,
      fontFamily: '"Geist Mono", monospace',
      fontWeight: 400,
    },
    fontWeightBold: 700,
    fontWeightMedium: 500,
    fontWeightRegular: 400,
  },
  shape: { borderRadius: 8 }, // Chorus: 8px max radius per DESIGN.md
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 500,
          transition:
            "background-color 150ms ease, border-color 150ms ease, box-shadow 150ms ease",
          borderRadius: "6px", // Per DESIGN.md: 6px for buttons
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none",
          },
          "&:active": {
            boxShadow: "none",
          },
        },
        contained: {
          backgroundColor: "#5e6ad2", // accent
          color: "#eae8f0", // ink
          "&:hover": {
            backgroundColor: "#7a83e8", // accent-light
          },
          "&:disabled": {
            backgroundColor: "#282d3d", // border
            color: "#464d5d", // ink-faint
          },
        },
        outlined: {
          borderColor: "#282d3d", // border
          color: "#eae8f0", // ink
          "&:hover": {
            backgroundColor: "#1a1f2e", // surface-raised
            borderColor: "#5e6ad2", // accent
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            color: "#eae8f0", // ink
            backgroundColor: "#13161e", // surface
            borderRadius: "8px",
            transition:
              "border-color 150ms ease, background-color 150ms ease",
            "& fieldset": {
              borderColor: "#282d3d", // border
            },
            "&:hover fieldset": {
              borderColor: "#282d3d",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#5e6ad2", // accent focus
              borderWidth: "1px",
            },
          },
          "& .MuiOutlinedInput-input::placeholder": {
            color: "#464d5d", // ink-faint
            opacity: 1,
          },
          "& .MuiInputBase-input": {
            fontFamily: '"Geist", sans-serif',
            fontSize: "0.9375rem",
            lineHeight: 1.6,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontFamily: '"Geist Mono", monospace',
          fontSize: "0.75rem",
          fontWeight: 500,
          height: "auto",
          padding: "6px 10px",
          borderRadius: "20px",
          transition: "background-color 150ms, border-color 150ms",
          "&.MuiChip-filled": {
            backgroundColor: "#1a1f2e", // surface-raised
            color: "#eae8f0", // ink
          },
          "&.MuiChip-outlined": {
            borderColor: "#282d3d", // border
            color: "#717486", // ink-muted
          },
        },
        deleteIcon: {
          color: "#717486",
          "&:hover": {
            color: "#eae8f0",
          },
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: `
        html {
          font-kerning: normal;
          font-optical-sizing: auto;
          text-rendering: optimizeLegibility;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        body {
          background-color: #0d0f13;
          color: #eae8f0;
        }

        code, pre {
          font-family: "Geist Mono", monospace;
        }

        @keyframes pulse-cursor {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0;
          }
        }

        .streaming-cursor {
          display: inline-block;
          width: 2px;
          height: 1em;
          background-color: #5e6ad2;
          margin-left: 2px;
          animation: pulse-cursor 1s steps(2, start) infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            transition-duration: 0.01ms !important;
            animation-duration: 0.01ms !important;
          }
          .streaming-cursor {
            animation: none;
            opacity: 1;
          }
        }
      `,
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "#13161e", // surface
          border: "1px solid #282d3d", // border
        },
        elevation0: {
          boxShadow: "none",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#0d0f13", // bg
          borderBottom: "1px solid #282d3d", // border
          boxShadow: "none",
        },
      },
    },
  },
});
