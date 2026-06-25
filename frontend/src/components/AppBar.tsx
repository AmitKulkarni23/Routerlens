import { AppBar as MuiAppBar, Toolbar, Typography, Box } from "@mui/material";

export function AppBar() {
  return (
    <MuiAppBar position="sticky">
      <Toolbar>
        {/* Left: Logo mark + text */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {/* 3-bar mark: ||| */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "3px",
              height: "24px",
            }}
          >
            {[0, 1, 2].map((i) => (
              <Box
                key={i}
                sx={{
                  width: "2px",
                  height: "12px",
                  backgroundColor: "#5e6ad2",
                  opacity: 0.6,
                }}
              />
            ))}
          </Box>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 600,
              fontSize: "1rem",
              letterSpacing: "-0.02em",
              color: "#eae8f0",
            }}
          >
            Chorus
          </Typography>
        </Box>

        {/* Right: Tagline */}
        <Box sx={{ ml: "auto" }}>
          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: "0.65rem",
              color: "#464d5d",
              letterSpacing: "0.02em",
            }}
          >
            parallel inference · free tier
          </Typography>
        </Box>
      </Toolbar>
    </MuiAppBar>
  );
}
