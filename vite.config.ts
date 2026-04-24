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
    // Only preload entry chunks, not the transitive closure of every dynamic import.
    // Without this, Vite emits 60+ <link rel="modulepreload"> tags on the homepage
    // because every React.lazy() route gets its dep graph preloaded eagerly.
    modulePreload: {
      resolveDependencies: (_filename, deps) => {
        // Keep only deps for the entry; route chunks load on navigation.
        return deps.filter((d) => /react-vendor|^assets\/vendor\.js$|supabase/.test(d));
      },
    },
    rollupOptions: {
      output: {
        chunkFileNames: "assets/[name].js",
        entryFileNames: "assets/[name].js",
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          // Keep the critical runtime together for stable cold starts.
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/scheduler/") ||
            id.includes("react-router") ||
            id.includes("react-helmet-async") ||
            id.includes("@tanstack")
          ) {
            return "react-vendor";
          }

          // Backend client stays isolated and cacheable.
          if (id.includes("@supabase")) return "supabase";

          // Everything else shares one vendor chunk so we don't emit dozens of
          // tiny library chunks (icons, UI primitives, dates, charts, pdf, etc).
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
