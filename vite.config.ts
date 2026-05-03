import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), "") };
  const SUPABASE_URL = env.VITE_SUPABASE_URL ?? "https://ngrkbohpmkzjonaofgbb.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ??
    env.VITE_SUPABASE_ANON_KEY ??
    "sb_publishable_BPW9omcmNwRZnH6blNp9Sw_lk7f4F_D";
  const SUPABASE_PROJECT_ID = env.VITE_SUPABASE_PROJECT_ID ?? "ngrkbohpmkzjonaofgbb";

  return ({
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(SUPABASE_URL),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(SUPABASE_PUBLISHABLE_KEY),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(SUPABASE_PUBLISHABLE_KEY),
    'import.meta.env.VITE_SUPABASE_PROJECT_ID': JSON.stringify(SUPABASE_PROJECT_ID),
  },
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
          if (id.includes("@radix-ui")) return "radix";

          return "vendor";
        },
      },
    },
  },
  optimizeDeps: {
    force: true,
    include: [
      'lucide-react',
      'react',
      'react-dom',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-accordion',
      '@radix-ui/react-collapsible',
      'framer-motion',
      'recharts',
    ],
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  });
});
