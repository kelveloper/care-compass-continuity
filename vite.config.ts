import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Performance optimizations for sub-3-second load times
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    
    // Optimize chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          'query-vendor': ['@tanstack/react-query'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'router-vendor': ['react-router-dom'],
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          'chart-vendor': ['recharts'],
          'date-vendor': ['date-fns'],
          'utils-vendor': ['clsx', 'tailwind-merge', 'class-variance-authority'],
        },
        // Optimize chunk file names for caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `js/[name]-[hash].js`;
        },
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `img/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext)) {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    
    // Optimize chunk size limits
    chunkSizeWarningLimit: 1000,
    
    // Enable source maps for production debugging (can be disabled for smaller builds)
    sourcemap: mode === 'development',
    
    // Optimize CSS
    cssCodeSplit: true,
  },
  
  // Performance optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js',
      'react-router-dom',
      'lucide-react',
      'date-fns',
      'clsx',
      'tailwind-merge',
    ],
    exclude: ['@vercel/analytics'],
  },
  
  // Enable esbuild for faster builds
  esbuild: {
    target: 'esnext',
    platform: 'browser',
    format: 'esm',
    // Remove console.log in production for smaller bundles
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}));
