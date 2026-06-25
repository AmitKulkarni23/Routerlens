import { AppBar as MuiAppBar, Toolbar, Typography } from "@mui/material";

export function AppBar() {
  return (
    <MuiAppBar position="sticky">
      <Toolbar>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 600,
            fontSize: "1rem",
            letterSpacing: "-0.01em",
          }}
        >
          Chorus
        </Typography>
      </Toolbar>
    </MuiAppBar>
  );
}
