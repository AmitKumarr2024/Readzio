import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    base: "/", // ✅ ensures correct relative paths
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
    },
    build: {
      outDir: "dist", // ✅ used by Express
      chunkSizeWarningLimit: 1500,
      sourcemap: false, // optional: disable maps for smaller build
      rollupOptions: {
        output: {
          // ✅ Dynamically split chunks only by package name
          manualChunks(id) {
            if (id.includes("node_modules")) {
              const segments = id
                .toString()
                .split("node_modules/")[1]
                .split("/");
              return segments[0];
            }
          },
        },
      },
    },
  };
});
