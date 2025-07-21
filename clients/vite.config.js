import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  // console.log("[ViteConfig] Environment:", { mode, VITE_API_BASE_URL: env.VITE_API_BASE_URL });

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
          rewrite: (path) => path, // or remove rewrite
          configure: (proxy) => {
            proxy.on("error", (err) => {
              console.error("[ViteConfig:Proxy] /api error:", err.message);
            });
          },
        },
        "/socket.io": {
          target: env.VITE_API_BASE_URL || "http://localhost:8001",
          ws: true,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on("error", (err) => {
              console.error(
                "[ViteConfig:Proxy] /socket.io error:",
                err.message
              );
            });
          },
        },
      },
    },
  };
});
