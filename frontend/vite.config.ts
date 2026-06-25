import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: { outDir: "dist", emptyOutDir: true },
    server: {
      proxy: {
        "/api/models": {
          target: env.MODELS_LAMBDA_URL ?? "http://localhost:9001",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
        "/api/chorus": {
          target: env.CHORUS_LAMBDA_URL ?? "http://localhost:9002",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});
