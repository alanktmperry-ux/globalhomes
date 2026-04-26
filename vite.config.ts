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
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    // Only preload entry chunks, not the transitive closure of every dynamic import.
    // Without this, Vite emits 60+ <link rel="modulepreload"> tags on the homepage
    // because every React.lazy() route gets its dep graph preloaded eagerly.
    modulePreload: {
      resolveDependencies: (_filename, deps) => {
        return deps.filter((d) => /vendor|supabase/.test(d));
      },
    },
    rollupOptions: {
      output: {
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          // Heavy libs that should stay split off the critical path
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("react-day-picker") || id.includes("date-fns")) return "datepicker";
          if (id.includes("jspdf") || id.includes("html2canvas") || id.includes("pdfjs")) return "pdf";
          if (id.includes("@sentry")) return "sentry";
          if (id.includes("mapbox-gl") || id.includes("@googlemaps")) return "maps";
          if (id.includes("framer-motion")) return "motion";

          if (id.includes("react/") || id.includes("react-dom") || id.includes("react-router")) return "react-core";
          if (id.includes("@radix-ui")) return "radix-ui";
          if (id.includes("@tanstack") || id.includes("react-hook-form") || id.includes("zod")) return "react-utils";
          if (id.includes("lucide-react")) return "icons";

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
