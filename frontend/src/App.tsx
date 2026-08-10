import { useEffect } from "react";
import { BrowserRouter, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { AppBar, Box, Container, Tab, Tabs, Toolbar, Typography } from "@mui/material";
import ProviderOverview from "./pages/ProviderOverview";
import PassRateChart from "./pages/PassRateChart";
import IncidentsFeed from "./pages/IncidentsFeed";
import CategoryBreakdown from "./pages/CategoryBreakdown";
import Methodology from "./pages/Methodology";
import ProviderDetail from "./pages/ProviderDetail";

const NAV = [
  { label: "Overview", to: "/", docTitle: "Routerlens" },
  { label: "Pass Rate", to: "/timeseries", docTitle: "Pass Rate — Routerlens" },
  { label: "Categories", to: "/categories", docTitle: "Categories — Routerlens" },
  { label: "Incidents", to: "/incidents", docTitle: "Incidents — Routerlens" },
  { label: "Methodology", to: "/methodology", docTitle: "Methodology — Routerlens" },
];

function useDocumentTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    const providerMatch = pathname.match(/^\/provider\/(.+)/);
    if (providerMatch) {
      document.title = `${decodeURIComponent(providerMatch[1])} — Routerlens`;
      return;
    }
    const match = NAV.find((n) =>
      n.to === "/" ? pathname === "/" : pathname.startsWith(n.to),
    );
    document.title = match?.docTitle ?? "Routerlens";
  }, [pathname]);
}

function NavTabs() {
  const { pathname } = useLocation();
  useDocumentTitle();
  const current = NAV.findIndex((n) =>
    n.to === "/" ? pathname === "/" : pathname.startsWith(n.to),
  );

  return (
    <Tabs value={current === -1 ? 0 : current} textColor="inherit">
      {NAV.map(({ label, to }) => (
        <Tab
          key={to}
          label={label}
          component={NavLink}
          to={to}
        />
      ))}
    </Tabs>
  );
}

if (typeof window !== "undefined" && import.meta.env.PROD) {
  console.log(
    "%cRouterlens",
    "font-weight:700;font-size:14px;color:#2d6a4f",
    "— per-provider quality monitoring for OpenRouter.\nhttps://github.com/amitrk/Chorus",
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppBar position="sticky" color="default">
        <Toolbar sx={{ gap: 1 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: "primary.main",
              flexShrink: 0,
            }}
          />
          <Typography
            variant="h6"
            sx={{
              mr: 4,
              fontWeight: 700,
              fontSize: "1rem",
              letterSpacing: "-0.01em",
              color: "text.primary",
            }}
          >
            Routerlens
          </Typography>
          <NavTabs />
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 5 }}>
        <Routes>
          <Route path="/" element={<ProviderOverview />} />
          <Route path="/provider/:name" element={<ProviderDetail />} />
          <Route path="/timeseries" element={<PassRateChart />} />
          <Route path="/categories" element={<CategoryBreakdown />} />
          <Route path="/incidents" element={<IncidentsFeed />} />
          <Route path="/methodology" element={<Methodology />} />
        </Routes>
      </Container>
    </BrowserRouter>
  );
}
