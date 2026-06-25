import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import { theme } from "./theme";
import { AppBar } from "@/components/AppBar";
import { ChorusPage } from "@/pages/ChorusPage";

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar />
      <ChorusPage />
    </ThemeProvider>
  );
}
