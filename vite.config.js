import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import svgr from "vite-plugin-svgr";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        exportType: "default",
        ref: true,
        svgo: false,
        titleProp: true,
      },
      include: "**/*.svg",
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 8080,
  },
  build: {
     rollupOptions: {
      input: 'index.html',
      output: {
        // Every route is already `lazy()`-loaded (see AppRoutes.jsx), and
        // wagmi/viem/WalletConnect already split themselves into their own
        // chunks via their own internal dynamic imports (confirmed in the
        // build output: core/w3m-modal/sendRawTransaction). What's left
        // sitting inside the single large main-entry chunk is React itself
        // plus two sizable, independent libraries used across many
        // (but not all) routes — splitting just those three out lets the
        // browser cache the framework and each library separately from
        // this app's own code, so a normal deploy (which only changes app
        // code) doesn't force users to re-download React or Recharts too.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-dom") || id.includes("/react/") || id.includes("react-router")) {
            return "vendor-react";
          }
          if (id.includes("recharts") || id.includes("d3-")) {
            return "vendor-charts";
          }
          if (id.includes("framer-motion")) {
            return "vendor-motion";
          }
        },
      },
    },
    target: "es2020",
    sourcemap: true,
  },
});