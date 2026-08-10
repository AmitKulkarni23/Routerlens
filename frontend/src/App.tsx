import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import { AppBar, Container, Tab, Tabs, Toolbar, Typography } from "@mui/material";
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

export default function App() {
  return (
    <BrowserRouter>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ mr: 4, fontWeight: 700 }}>
            Routerlens
          </Typography>
          <Tabs value={false} textColor="inherit" indicatorColor="primary">
            {NAV.map(({ label, to }) => (
              <Tab
                key={to}
                label={label}
                component={NavLink}
                to={to}
                sx={{ minHeight: 64 }}
              />
            ))}
          </Tabs>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ py: 4 }}>
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
