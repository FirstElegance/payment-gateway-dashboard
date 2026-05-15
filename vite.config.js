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

  const proxyOptions = {
    target: apiBaseUrl,
    changeOrigin: true,
    secure: false,
    bypass(req) {
      const url = req.url?.split("?")[0] ?? "";

      // Vite HMR / internal
      if (url.startsWith("/@") || url.includes("node_modules")) {
        return url;
      }

      // Static assets (js, css, images, fonts, …)
      if (/\.[a-zA-Z0-9]+$/.test(url)) {
        return url;
      }

      // Browser navigation → SPA (e.g. /bank-configs, /wallet, /members)
      if (req.headers.accept?.includes("text/html")) {
        return url;
      }

      // Everything else (axios/fetch API calls) → backend
      return null;
    },
    ...(normalizedToken && {
      configure: (proxy) => {
        proxy.on("proxyReq", (proxyReq) => {
          proxyReq.setHeader("Authorization", normalizedToken);
        });
      },
    }),
  };

  return {
    plugins: [react()],
    server: {
      proxy: {
        // All API paths — no /api prefix; bypass keeps SPA routes on Vite
        "^/(?!@|node_modules|src/).*": proxyOptions,
      },
    },
  };
});
