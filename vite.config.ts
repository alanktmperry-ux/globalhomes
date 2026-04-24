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
          // React core + router + small always-needed deps in one chunk.
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
          if (id.includes("@supabase")) return "supabase";
          // Heavy libs split into their own chunks so they only load when needed
          if (id.includes("recharts") || id.includes("d3-") || id.includes("victory") || id.includes("react-smooth")) return "charts";
          if (id.includes("framer-motion") || id.includes("motion-dom") || id.includes("motion-utils")) return "motion";
          if (id.includes("@radix-ui") || id.includes("@floating-ui") || id.includes("aria-hidden") || id.includes("react-remove-scroll")) return "radix";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("react-hook-form") || id.includes("@hookform")) return "forms";
          if (id.includes("react-markdown") || id.includes("remark") || id.includes("micromark") || id.includes("mdast") || id.includes("hast")) return "markdown";
          if (id.includes("date-fns") || id.includes("react-day-picker")) return "dates";
          if (id.includes("embla-carousel")) return "carousel";
          if (id.includes("jspdf") || id.includes("html2canvas") || id.includes("canvg") || id.includes("dompurify") || id.includes("svg-pathdata") || id.includes("stackblur") || id.includes("rgbcolor") || id.includes("fast-png") || id.includes("iobuffer")) return "pdf";
          if (id.includes("@sentry")) return "sentry";
          if (id.includes("@googlemaps") || id.includes("supercluster") || id.includes("kdbush")) return "maps";
          if (id.includes("@hcaptcha")) return "captcha";
          if (id.includes("cmdk") || id.includes("vaul") || id.includes("sonner") || id.includes("input-otp") || id.includes("react-resizable-panels") || id.includes("react-window") || id.includes("next-themes")) return "ui-extras";
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
