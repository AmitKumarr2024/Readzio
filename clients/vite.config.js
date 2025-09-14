import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🚀 Initializing Vite config, __dirname:", __dirname);

export default defineConfig(({ mode }) => {
  console.log("⚙️ Loading Vite config for mode:", mode);
  const env = loadEnv(mode, process.cwd());
  console.log("📚 Environment variables loaded:", Object.keys(env));

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
          target: env.VITE_API_BASE_URL || "http://localhost:10000",
          changeOrigin: true,
          secure: false,
          rewrite: (path) => {
            console.log("🔄 API proxy rewriting path:", path);
            return path;
          },
          configure: (proxy) => {
            console.log(
              "🔌 Setting up /api proxy to:",
              env.VITE_API_BASE_URL || "http://localhost:10000"
            );
            proxy.on("error", (err) => {
              console.error("[ViteConfig:Proxy] ❌ /api error:", err.message);
            });
            proxy.on("proxyReq", (proxyReq, req) => {
              console.log(
                `[ViteProxy] 📤 ${req.method} ${
                  req.url
                } -> ${proxyReq.getHeader("host")}`
              );
            });
          },
        },
        "/socket.io": {
          target: env.VITE_API_BASE_URL || "http://localhost:10000",
          ws: true,
          changeOrigin: true,
          configure: (proxy) => {
            console.log(
              "🔌 Setting up /socket.io proxy to:",
              env.VITE_API_BASE_URL || "http://localhost:10000"
            );
            proxy.on("error", (err) => {
              console.error(
                "[ViteConfig:Proxy] ❌ /socket.io error:",
                err.message
              );
            });
            proxy.on("proxyReq", (proxyReq, req) => {
              console.log(
                `[SocketProxy] 📤 ${req.method} ${
                  req.url
                } -> ${proxyReq.getHeader("host")}`
              );
            });
          },
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 2500,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom"],
            // Only include packages you actually have installed
            // router: ['react-router-dom'], // Uncomment if you use react-router-dom
          },
        },
      },
    },
  };
});
