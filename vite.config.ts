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
        // Keep only deps for the entry; route chunks load on navigation.
        // Match hashed filenames like react-vendor-abc123.js, vendor-xyz.js, supabase-foo.js
        return deps.filter((d) => /react-vendor|vendor|supabase/.test(d));
      },
    },
    rollupOptions: {
      output: {
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
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

          // Heavy libs that are NOT used on the homepage — split out so they
          // are fetched only when a route that needs them is loaded. With
          // modulePreload restricted to entry chunks, these stay off the
          // critical path until React.lazy() pulls them in on navigation.
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("react-day-picker") || id.includes("date-fns")) return "datepicker";
          if (id.includes("jspdf") || id.includes("html2canvas") || id.includes("pdfjs")) return "pdf";
          if (id.includes("@sentry")) return "sentry";
          if (id.includes("mapbox-gl") || id.includes("@googlemaps")) return "maps";
          // framer-motion is heavy (~50KB gz). Index.tsx statically imports
          // motion/useMotionValue/useSpring for the mobile bottom-sheet drag in
          // the search-results branch. Splitting it out keeps it as a parallel
          // request that doesn't block first paint of the landing hero.
          if (id.includes("framer-motion")) return "motion";

          // Everything else (lucide icons, radix UI, sonner, small utilities)
          // shares one vendor chunk loaded with the homepage.
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
