import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "src/shared"),
      "@assets": path.resolve(__dirname, "../attached_assets"),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:3002'
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  }
});