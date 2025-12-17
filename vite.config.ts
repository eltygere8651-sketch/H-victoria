import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Deshabilitar sourcemaps en producción para ahorrar ancho de banda
    target: 'es2020',
    rollupOptions: {
      output: {
        // Estrategia de división de código (Code Splitting) para carga más rápida
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'firebase/messaging'],
          'vendor-ui': ['lucide-react', 'recharts']
        }
      }
    }
  },
  esbuild: {
    target: 'es2020'
  }
});