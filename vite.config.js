import http from "node:http";
import https from "node:https";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const PORTAL_PREFIX = "/__portal__/";

const isPortalBankingPath = (url = "") =>
  url === "/portalbanking" || url.startsWith("/portalbanking/");

const decodePortalOrigin = (segment) => {
  try {
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const pad =
      base64.length % 4 === 0
        ? base64
        : base64 + "=".repeat(4 - (base64.length % 4));
    return Buffer.from(pad, "base64").toString("utf8");
  } catch {
    return null;
  }
};

const portalProxyPlugin = () => ({
  name: "portal-proxy",
  configureServer: {
    order: "pre",
    handler(server) {
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url || "";
        const pathname = rawUrl.split("?")[0];

        if (!pathname.startsWith(PORTAL_PREFIX)) {
          return next();
        }

        const rest = pathname.slice(PORTAL_PREFIX.length);
        const slashIdx = rest.indexOf("/");
        if (slashIdx === -1) {
          res.statusCode = 400;
          res.end("Invalid portal proxy path");
          return;
        }

        const originEnc = rest.slice(0, slashIdx);
        const apiPath = rest.slice(slashIdx) || "/";
        const query = rawUrl.includes("?")
          ? rawUrl.slice(rawUrl.indexOf("?"))
          : "";

        const origin = decodePortalOrigin(originEnc);
        if (!origin) {
          res.statusCode = 400;
          res.end("Invalid portal origin");
          return;
        }

        let targetUrl;
        try {
          targetUrl = new URL(`${apiPath}${query}`, origin);
        } catch {
          res.statusCode = 400;
          res.end("Invalid target URL");
          return;
        }

        const lib = targetUrl.protocol === "https:" ? https : http;
        const headers = { ...req.headers, host: targetUrl.host };

        delete headers.connection;

        const proxyReq = lib.request(
          targetUrl,
          {
            method: req.method,
            headers,
            rejectUnauthorized: false,
          },
          (proxyRes) => {
            res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
            proxyRes.pipe(res);
          },
        );

        proxyReq.on("error", (err) => {
          console.error("[portal-proxy]", targetUrl.toString(), err.message);
          if (!res.headersSent) {
            res.statusCode = 502;
            res.end(`Portal proxy error: ${err.message}`);
          }
        });

        if (req.method === "GET" || req.method === "HEAD") {
          proxyReq.end();
        } else {
          req.pipe(proxyReq);
        }
      });
    },
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiBaseUrl = env.VITE_PAYMENT_URL || "";
  const apiAuthToken = env.VITE_PAYMENT_TOKEN || "";

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

      if (url.startsWith("/@") || url.includes("node_modules")) {
        return url;
      }

      if (/\.[a-zA-Z0-9]+$/.test(url)) {
        return url;
      }

      if (req.headers.accept?.includes("text/html")) {
        return url;
      }

      return null;
    },
    configure: (proxy) => {
      proxy.on("proxyReq", (proxyReq, req) => {
        const url = req.url?.split("?")[0] ?? "";

        // /portalbanking ใช้ Bearer จาก superadmin login — ห้าม override ด้วย .env Basic
        if (isPortalBankingPath(url)) {
          return;
        }

        // client ส่ง Authorization มาแล้ว (merchant Basic / env Basic) ให้ใช้ของ client
        if (req.headers.authorization) {
          return;
        }

        if (normalizedToken) {
          proxyReq.setHeader("Authorization", normalizedToken);
        }
      });
    },
  };

  return {
    plugins: [
      react(),
      portalProxyPlugin(),
      VitePWA({
        registerType: "autoUpdate",
        devOptions: {
          enabled: false,
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
          navigateFallbackDenylist: [/^\/api\//, /^\/__portal__\//],
        },
      }),
    ],

    server: {
      host: true,
      allowedHosts: true,
      proxy: {
        "^/(?!@|node_modules|src/|__portal__).*": proxyOptions,
      },
    },
  };
});
