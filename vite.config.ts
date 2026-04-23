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
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/lucide-react')) return 'lucide';
          if (id.includes('node_modules/recharts')) return 'vendor-charts';
          if (id.includes('node_modules/d3') || id.includes('node_modules/d3-')) return 'vendor-d3';
          if (id.includes('node_modules/framer-motion')) return 'vendor-animation';
          if (id.includes('node_modules/@radix-ui')) return 'vendor-radix';
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor-react';
          if (id.includes('node_modules/')) return 'vendor-misc';
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
