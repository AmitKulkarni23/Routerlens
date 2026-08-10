import { Box, Divider, Typography } from "@mui/material";

export default function Methodology() {
  return (
    <Box sx={{ maxWidth: 720 }}>
      <Typography variant="h5" gutterBottom>Methodology</Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        Routerlens measures per-provider output quality for a single model served across multiple
        OpenRouter hosting providers. The same model ID can be served by Groq, DeepInfra, Novita,
        Together, and others — each potentially running a different quantization — and OpenRouter
        routes on price, speed, and uptime, not output quality. Routerlens makes quality observable.
      </Typography>

      <Divider sx={{ my: 2 }} />
      <Typography variant="h6" gutterBottom>What is measured</Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        A fixed question bank (80 items across 10 categories) is sent to the same model pinned to
        each provider via <code>provider.allow_fallbacks = false</code>. Each item is repeated 3
        times per provider per run (960 calls/day). Results are timestamped and stored; the
        accumulated time series is the product.
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Probed providers: Groq (quantization undisclosed), DeepInfra (fp8), Novita (bf16),
        Together (fp8). Calibration reference: CoreWeave (fp16). Model: meta-llama/llama-3.3-70b-instruct.
      </Typography>

      <Divider sx={{ my: 2 }} />
      <Typography variant="h6" gutterBottom>How grading works</Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Grading is entirely mechanical — no LLM judge, ever. Four strategies are used:
      </Typography>
      <Box component="ul" sx={{ pl: 3 }}>
        <li><Typography variant="body2"><strong>numeric</strong> — strip whitespace/commas/trailing period, parse both sides as a number, compare within ε = 1e-9.</Typography></li>
        <li><Typography variant="body2"><strong>exact</strong> — trim outer whitespace, compare byte-equal (case-sensitive).</Typography></li>
        <li><Typography variant="body2"><strong>exact_nospace</strong> — remove all whitespace from both sides, then compare byte-equal.</Typography></li>
        <li><Typography variant="body2"><strong>json</strong> — strip markdown code fences if present, parse both sides as JSON, compare by deep structural equality (key order and whitespace irrelevant).</Typography></li>
      </Box>

      <Divider sx={{ my: 2 }} />
      <Typography variant="h6" gutterBottom>Calibration</Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        A calibration run uses the CoreWeave provider (fp16, full-precision reference) to establish
        a baseline pass rate per item. Items where the reference provider scores below a ceiling
        threshold are retired from active scoring to prevent floor effects from contaminating
        provider comparisons. Items are periodically reviewed for retirement.
      </Typography>

      <Divider sx={{ my: 2 }} />
      <Typography variant="h6" gutterBottom>Neutrality</Typography>
      <Typography variant="body2">
        This dashboard shows measurements. It does not rank, score, or declare winners. All
        providers are presented with equal visual weight. The goal is observability, not
        endorsement or condemnation.
      </Typography>
    </Box>
  );
}
