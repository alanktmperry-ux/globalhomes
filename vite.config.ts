import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), "") };
  const SUPABASE_URL = env.VITE_SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.VITE_SUPABASE_ANON_KEY;
  const SUPABASE_PROJECT_ID = env.VITE_SUPABASE_PROJECT_ID;

  if (mode === 'production') {
    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      throw new Error(
        "[Config] VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY is not set. " +
        "Set these in Lovable project settings or in .env.production before building."
      );
    }
  } else if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    console.error('[Config] Supabase env vars missing — dev build will not connect to Supabase.');
  }
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
    chunkSizeWarningLimit: 600,
    // Only preload entry chunks, not the transitive closure of every dynamic import.
    // Without this, Vite emits 60+ <link rel="modulepreload"> tags on the homepage
    // because every React.lazy() route gets its dep graph preloaded eagerly.
    modulePreload: {
      polyfill: false,
      resolveDependencies: (_filename, deps) => {
        return deps.filter((dep) => {
          if (dep.includes('feature-agents')) return false;
          if (dep.includes('feature-admin')) return false;
          if (dep.includes('feature-marketing')) return false;
          if (dep.includes('feature-halo')) return false;
          if (dep.includes('feature-auctions')) return false;
          if (dep.includes('feature-rentals')) return false;
          if (dep.includes('feature-messaging')) return false;
          if (dep.includes('feature-trust')) return false;
          if (dep.includes('charts')) return false;
          if (dep.includes('stripe')) return false;
          if (dep.includes('pdf')) return false;
          if (dep.includes('rich-text')) return false;
          if (dep.includes('icons')) return false;
          if (dep.includes('maps')) return false;
          if (dep.includes('motion')) return false;
          if (dep.includes('datepicker')) return false;
          if (dep.includes('sentry')) return false;
          if (dep.includes('supabase-realtime')) return false;
          if (dep.match(/\/locales\/(?!en)/)) return false;
          return true;
        });
      },
    },
    rollupOptions: {
      output: {
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
        banner: mode === 'production'
          ? '/*! ListHQ — Proprietary code © ' + new Date().getFullYear() + ' ListHQ Pty Ltd. All rights reserved. Reproduction or reverse-engineering prohibited under Australian copyright and trade secret law. */'
          : undefined,
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // Lazy / page-specific heavies first
            if (id.includes("@supabase/realtime-js")) return "supabase-realtime";
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("recharts") || id.includes("victory") || /[\\/]d3-/.test(id)) return "charts";
            if (id.includes("@stripe")) return "stripe";
            if (id.includes("jspdf") || id.includes("pdf-lib") || id.includes("html2canvas") || id.includes("pdfjs")) return "pdf";
            if (id.includes("@tiptap") || id.includes("prosemirror") || /[\\/]slate[\\/]/.test(id)) return "rich-text";
            if (id.includes("mapbox-gl") || id.includes("@googlemaps") || id.includes("@react-google-maps")) return "maps";
            if (id.includes("react-day-picker") || id.includes("date-fns") || id.includes("dayjs")) return "vendor-date";
            if (id.includes("@sentry")) return "sentry";
            if (id.includes("@iconify")) return "icons";
            if (id.includes("framer-motion")) return "motion";
            if (id.includes("i18next") || id.includes("react-i18next")) return "vendor-i18n";
            if (id.includes("@tanstack/react-query")) return "vendor-react-query";
            if (id.includes("react-hook-form") || id.includes("@hookform")) return "vendor-forms";
            if (id.includes("zod")) return "vendor-validation";
            // NOTE: Do NOT split @radix-ui into its own chunk. Radix modules call
            // React.forwardRef at module-evaluation time, so they must live in the
            // same chunk as React (vendor). A separate "radix" chunk loads before
            // "vendor" in production and crashes Safari with a white screen:
            // "Cannot read properties of undefined (reading 'forwardRef')".
            return "vendor";
          }
          // App code: group by feature area so lazy routes share chunks.
          if (id.includes("/features/admin/")) return "feature-admin";
          if (id.includes("/features/agents/")) return "feature-agents";
          if (id.includes("/features/marketing/")) return "feature-marketing";
          if (id.includes("/features/halo/")) return "feature-halo";
          if (id.includes("/features/auctions/")) return "feature-auctions";
          if (id.includes("/features/rentals/")) return "feature-rentals";
          if (id.includes("/features/messaging/")) return "feature-messaging";
          if (id.includes("/features/trust/") || id.includes("/features/bank-recon/") || id.includes("/features/bond")) return "feature-trust";
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
