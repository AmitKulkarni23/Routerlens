import { BrowserRouter, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { AppBar, Box, Container, Tab, Tabs, Toolbar, Typography } from "@mui/material";
import ProviderOverview from "./pages/ProviderOverview";
import PassRateChart from "./pages/PassRateChart";
import IncidentsFeed from "./pages/IncidentsFeed";
import CategoryBreakdown from "./pages/CategoryBreakdown";
import Methodology from "./pages/Methodology";

const NAV = [
  { label: "Overview", to: "/" },
  { label: "Pass Rate", to: "/timeseries" },
  { label: "Categories", to: "/categories" },
  { label: "Incidents", to: "/incidents" },
  { label: "Methodology", to: "/methodology" },
];

function NavTabs() {
  const { pathname } = useLocation();
  const current = NAV.findIndex((n) => n.to === pathname);

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
          <Route path="/timeseries" element={<PassRateChart />} />
          <Route path="/categories" element={<CategoryBreakdown />} />
          <Route path="/incidents" element={<IncidentsFeed />} />
          <Route path="/methodology" element={<Methodology />} />
        </Routes>
      </Container>
    </BrowserRouter>
  );
}
