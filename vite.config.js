import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBaseUrl = env.VITE_PAYMENT_URL || "";
  const apiAuthToken = env.VITE_PAYMENT_TOKEN || "";

  // Normalize token (ensure it has "Basic " prefix if needed)
  const normalizeToken = (token) => {
    if (!token) return null;
    return token.startsWith("Basic ") ? token : `Basic ${token}`;
  };
  const normalizedToken = normalizeToken(apiAuthToken);

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ""),
          ...(normalizedToken && {
            configure: (proxy) => {
              proxy.on("proxyReq", (proxyReq) => {
                proxyReq.setHeader("Authorization", normalizedToken);
              });
            },
          }),
        },
      },
    },
  };
});
