import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        chunkFileNames: "assets/[name].js",
        entryFileNames: "assets/[name].js",
        manualChunks(id) {
          if (id.includes("lucide-react")) return "ui-icons";
          if (id.includes("@radix-ui")) return "ui-radix";
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("react-router")
          ) {
            return "react-vendor";
          }
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("framer-motion")) return "framer";
          if (id.includes("@tanstack")) return "tanstack";
          if (id.includes("node_modules")) return "vendor";
        },
      },
    },
  },
  optimizeDeps: {
    include: ['lucide-react', 'react', 'react-dom', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', 'framer-motion', 'recharts'],
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
