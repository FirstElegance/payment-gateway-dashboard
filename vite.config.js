import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

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

      // Static assets
      if (/\.[a-zA-Z0-9]+$/.test(url)) {
        return url;
      }

      // Browser navigation → SPA
      if (req.headers.accept?.includes("text/html")) {
        return url;
      }

      // API → backend
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
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        devOptions: {
          enabled: true,
        },
        includeAssets: ["ec-icon.png", "pwa/*.png", "icon_bank/*.png"],
        manifest: {
          name: "EC Payment Gateway - Admin",
          short_name: "EC Admin",
          description: "ELEGANCE Payment Gateway Admin Dashboard",
          theme_color: "#dc2626",
          background_color: "#ffffff",
          display: "standalone",
          orientation: "any",
          start_url: "/",
          scope: "/",
          icons: [
            {
              src: "/pwa/icon-192-round.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/pwa/icon-512-round.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/ec-icon.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/pwa/icon-512-maskable.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/api\//],
        },
      }),
    ],

    server: {
      host: true,

      // อนุญาตทุก Host (เหมาะสำหรับ ngrok)
      allowedHosts: true,

      proxy: {
        "^/(?!@|node_modules|src/).*": proxyOptions,
      },
    },
  };
});