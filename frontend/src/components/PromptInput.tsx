import {
  Box,
  TextField,
  Button,
  Typography,
  Stack,
} from "@mui/material";

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  selectedCount: number;
}

const MAX_LENGTH = 2000;

export function PromptInput({
  value,
  onChange,
  onSubmit,
  disabled,
  selectedCount,
}: PromptInputProps) {
  const canSubmit = value.trim().length > 0 && selectedCount >= 2 && !disabled;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && canSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <Stack spacing={1}>
      <Typography
        variant="h5"
        sx={{
          fontSize: "0.7rem",
          fontFamily: '"Geist Mono", monospace',
          color: "#717486",
        }}
      >
        Prompt
      </Typography>

      <TextField
        fullWidth
        multiline
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => handleKeyDown(e as React.KeyboardEvent)}
        placeholder="Ask something..."
        disabled={disabled}
        maxRows={8}
        sx={{
          "& .MuiOutlinedInput-root": {
            fontFamily: '"Geist", sans-serif',
            fontSize: "0.875rem",
          },
        }}
      />

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: "#717486",
            fontFamily: '"Geist Mono", monospace',
            fontSize: "0.7rem",
          }}
        >
          {value.length} / {MAX_LENGTH}
        </Typography>

        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={!canSubmit}
          sx={{
            fontFamily: '"Geist", sans-serif',
            fontSize: "0.875rem",
            fontWeight: 500,
            textTransform: "none",
            minWidth: "120px",
          }}
        >
          Compare →
        </Button>
      </Box>
    </Stack>
  );
}
