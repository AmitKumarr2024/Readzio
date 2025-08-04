import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  console.log("[Vite] API base URL:", env.VITE_API_BASE_URL);

  return {
    plugins: [
      react(),
      tailwindcss({
        safelist: ["list-disc", "list-decimal", "list-inside"],
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      extensions: [".js", ".jsx", ".ts", ".tsx"],
    },
    define: {
      __APP_VERSION__: JSON.stringify(env.npm_package_version || "v1.0.0"),
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: env.VITE_API_BASE_URL || "http://localhost:8001",
          changeOrigin: true,
          secure: false,
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
              console.error("[ViteConfig:Proxy] /socket.io error:", err.message);
            });
          },
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom"],
            redux: ["@reduxjs/toolkit", "react-redux"],
            axios: ["axios"],
          },
        },
      },
    },
  };
});
