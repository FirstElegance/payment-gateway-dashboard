import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBaseUrl = env.VITE_PAYMENT_URL || "";
  const apiAuthToken = env.VITE_PAYMENT_TOKEN || "";

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api": {
          target: apiBaseUrl,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ""),
          ...(apiAuthToken && {
            configure: (proxy) => {
              proxy.on("proxyReq", (proxyReq) => {
                proxyReq.setHeader("Authorization", apiAuthToken);
              });
            },
          }),
        },
      },
    },
  };
});
