import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  console.log("[ViteConfig] Environment:", { mode, VITE_API_BASE_URL: env.VITE_API_BASE_URL });

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      extensions: [".js", ".jsx", ".ts", ".tsx"],
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: env.VITE_API_BASE_URL || "http://localhost:8001",
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ""),
          configure: (proxy) => {
            console.log("[ViteConfig:Proxy] Proxy configured for /api", {
              target: env.VITE_API_BASE_URL || "http://localhost:8001",
            });
            proxy.on("error", (err) => {
              console.error("[ViteConfig:Proxy] /api error:", err.message);
            });
            proxy.on("proxyReq", (proxyReq, req) => {
              console.log("[ViteConfig:Proxy] /api request:", req.method, req.url);
            });
            proxy.on("proxyRes", (proxyRes, req) => {
              console.log("[ViteConfig:Proxy] /api response:", proxyRes.statusCode, req.url);
            });
          },
        },
        "/socket.io": {
          target: env.VITE_API_BASE_URL || "http://localhost:8001",
          ws: true,
          changeOrigin: true,
          rewrite: (path) => path,
          configure: (proxy) => {
            console.log("[ViteConfig:Proxy] Proxy configured for /socket.io", {
              target: env.VITE_API_BASE_URL || "http://localhost:8001",
            });
            proxy.on("error", (err) => {
              console.error("[ViteConfig:Proxy] /socket.io error:", err.message);
            });
            proxy.on("proxyReq", (proxyReq, req) => {
              console.log("[ViteConfig:Proxy] /socket.io request:", req.url);
            });
            proxy.on("proxyRes", (proxyRes, req) => {
              console.log("[ViteConfig:Proxy] /socket.io response:", proxyRes.statusCode, req.url);
            });
          },
        },
      },
    },
  };
});