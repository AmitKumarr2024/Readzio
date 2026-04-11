import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// console.log("🚀 Initializing Vite config, __dirname:", __dirname);

export default defineConfig(({ mode }) => {
  // console.log("⚙️ Loading Vite config for mode:", mode);
  const env = loadEnv(mode, process.cwd());
  // console.log("📚 Environment variables loaded:", Object.keys(env));

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

    theme: {
      extend: {
        // ... your existing extensions
        animation: {
          fadeIn: "fadeIn 0.5s ease-in forwards",
          "tour-in": "tour-in 0.2s ease",
        },
        keyframes: {
          fadeIn: {
            "0%": { opacity: "0", transform: "translateY(10px)" },
            "100%": { opacity: "1", transform: "translateY(0)" },
          },
          "tour-in": {
            from: { opacity: 0, transform: "scale(0.95) translateY(6px)" },
            to: { opacity: 1, transform: "scale(1) translateY(0)" },
          },
        },
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: "http://localhost:10002",
          changeOrigin: true,
          secure: false,
          rewrite: (path) => {
            // console.log("🔄 API proxy rewriting path:", path);
            return path;
          },
          configure: (proxy) => {
            // console.log(
            //   "🔌 Setting up /api proxy to:",
            //   "http://localhost:10002"
            // );
            proxy.on("error", (err) => {
              console.error("[ViteConfig:Proxy] ❌ /api error:", err.message);
            });
            proxy.on("proxyReq", (proxyReq, req) => {
              // console.log(
              //   `[ViteProxy] 📤 ${req.method} ${
              //     req.url
              //   } -> ${proxyReq.getHeader("host")}`
              // );
            });
          },
        },
        "/socket.io": {
          target: "http://localhost:10002",
          ws: true,
          changeOrigin: true,
          configure: (proxy) => {
            // console.log(
            //   "🔌 Setting up /socket.io proxy to:",
            //   "http://localhost:10002"
            // );
            proxy.on("error", (err) => {
              console.error(
                "[ViteConfig:Proxy] ❌ /socket.io error:",
                err.message,
              );
            });
            proxy.on("proxyReq", (proxyReq, req) => {
              // console.log(
              //   `[SocketProxy] 📤 ${req.method} ${
              //     req.url
              //   } -> ${proxyReq.getHeader("host")}`
              // );
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
