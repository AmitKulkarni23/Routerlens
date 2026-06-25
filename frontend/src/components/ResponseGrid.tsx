import { Box } from "@mui/material";
import { useTheme, useMediaQuery } from "@mui/material";
import { PanelState } from "@/types/chorus";
import { ResponsePanel } from "./ResponsePanel";

interface ResponseGridProps {
  panels: Map<string, PanelState>;
}

export function ResponseGrid({ panels }: ResponseGridProps) {
  const theme = useTheme();
  const isLg = useMediaQuery(theme.breakpoints.up("lg"));
  const isMd = useMediaQuery(theme.breakpoints.up("md"));

  const panelArray = Array.from(panels.values());
  const panelCount = panelArray.length;

  // Calculate width for each panel based on screen size and count
  let widthPercent = "100%";
  if (isMd) {
    if (panelCount === 2) {
      widthPercent = "50%";
    } else if (panelCount === 3) {
      widthPercent = isLg ? "33.333%" : "50%";
    } else if (panelCount >= 4) {
      widthPercent = isLg ? "33.333%" : "50%";
    }
  }

  if (panelArray.length === 0) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "400px",
          color: "#464d5d",
          fontFamily: '"Geist Mono", monospace',
          fontSize: "0.875rem",
        }}
      >
        Select models and submit a prompt to see responses
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 2,
        width: "100%",
      }}
    >
      {panelArray.map((panel) => (
        <Box
          key={panel.model_id}
          sx={{
            width: widthPercent,
            minWidth: "300px",
            flex: isMd ? "0 0 calc(" + widthPercent + " - 1rem)" : "1 1 100%",
          }}
        >
          <ResponsePanel panel={panel} />
        </Box>
      ))}
    </Box>
  );
}
