import {
  Box,
  FormControlLabel,
  Checkbox,
  Stack,
  Typography,
  Chip,
  Alert,
  Tooltip,
} from "@mui/material";
import { ModelSummary } from "@/types/models";

interface ModelSelectorProps {
  models: ModelSummary[];
  selected: Set<string>;
  onSelectionChange: (modelId: string, checked: boolean) => void;
}

export function ModelSelector({
  models,
  selected,
  onSelectionChange,
}: ModelSelectorProps) {
  const maxModels = 6;
  const canAdd = selected.size < maxModels;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      {selected.size > 0 && (
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontSize: "0.7rem",
              fontFamily: '"Geist Mono", monospace',
              marginBottom: 1,
              color: "#717486",
            }}
          >
            Selected ({selected.size})
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {Array.from(selected).map((modelId) => {
              const model = models.find((m) => m.id === modelId);
              return (
                <Chip
                  key={modelId}
                  label={model?.name || modelId}
                  onDelete={() => onSelectionChange(modelId, false)}
                  variant="filled"
                  size="small"
                  sx={{
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: "0.7rem",
                    fontWeight: 500,
                  }}
                />
              );
            })}
          </Stack>
        </Box>
      )}

      <Box>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5, marginBottom: 1 }}>
          <Typography
            variant="h5"
            sx={{
              fontSize: "0.7rem",
              fontFamily: '"Geist Mono", monospace',
              color: "#717486",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Free Models ({models.length})
          </Typography>
          <Typography
            sx={{
              fontSize: "0.65rem",
              fontFamily: '"Geist Mono", monospace',
              color: "#2fa649",
              letterSpacing: "0.03em",
            }}
          >
            $0 · no credits used
          </Typography>
        </Box>

        <Stack spacing={0.5} sx={{ maxHeight: "300px", overflowY: "auto" }}>
          {models.map((model) => {
            const isSelected = selected.has(model.id);
            const isDisabled = !canAdd && !isSelected;

            return (
              <Tooltip
                key={model.id}
                title={
                  isDisabled ? `Max ${maxModels} models` : ""
                }
                disableInteractive
              >
                <Box
                  sx={{
                    borderRadius: "4px",
                    transition: "background-color 120ms ease",
                    minHeight: "36px",
                    display: "flex",
                    alignItems: "center",
                    "&:hover": !isDisabled ? { backgroundColor: "#1a1f2e" } : {},
                  }}
                >
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) =>
                          onSelectionChange(model.id, e.target.checked)
                        }
                        disabled={isDisabled}
                        size="small"
                      />
                    }
                    label={
                      <Typography
                        variant="body1"
                        sx={{
                          fontSize: "0.875rem",
                          fontFamily: '"Geist", sans-serif',
                        }}
                      >
                        {model.name}
                      </Typography>
                    }
                    sx={{
                      margin: 0,
                      width: "100%",
                      opacity: isDisabled ? 0.5 : 1,
                    }}
                  />
                </Box>
              </Tooltip>
            );
          })}
        </Stack>
      </Box>

      {selected.size < 2 && (
        <Alert severity="info" sx={{ fontSize: "0.875rem" }}>
          Select at least 2 models to compare
        </Alert>
      )}
    </Box>
  );
}
