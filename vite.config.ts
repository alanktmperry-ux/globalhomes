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
          if (!id.includes("node_modules")) return;
          // Keep React + everything that depends on React in ONE chunk to avoid
          // "Cannot read properties of undefined (reading 'Component')" caused
          // by vendor modules evaluating before React is initialised.
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/scheduler/") ||
            id.includes("react-router") ||
            id.includes("@radix-ui") ||
            id.includes("lucide-react") ||
            id.includes("react-helmet-async") ||
            id.includes("react-hook-form") ||
            id.includes("@hookform") ||
            id.includes("react-day-picker") ||
            id.includes("react-resizable-panels") ||
            id.includes("react-markdown") ||
            id.includes("react-window") ||
            id.includes("@tanstack") ||
            id.includes("framer-motion") ||
            id.includes("recharts") ||
            id.includes("embla-carousel") ||
            id.includes("cmdk") ||
            id.includes("vaul") ||
            id.includes("sonner") ||
            id.includes("next-themes") ||
            id.includes("input-otp")
          ) {
            return "react-vendor";
          }
          if (id.includes("@supabase")) return "supabase";
          return "vendor";
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
