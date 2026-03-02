import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
        'react-native': path.resolve(process.cwd(), 'src/lib/react-native-compat.ts'),
        '@react-native/assets-registry/registry': path.resolve(process.cwd(), 'src/lib/assets-registry-mock.ts'),
        'expo-asset': path.resolve(process.cwd(), 'src/lib/assets-registry-mock.ts'),
      }
    },
    optimizeDeps: {
      exclude: ['expo-notifications', 'expo-device', 'expo-constants', 'expo-modules-core', 'expo-asset', 'expo-linking', 'expo-web-browser'],
      esbuildOptions: {
        define: {
          __DEV__: 'true',
        },
      },
    },
    build: {
      rollupOptions: {
        external: ['expo-notifications', 'expo-device', 'expo-constants', 'expo-modules-core', 'expo-asset', 'react-native', '@react-native/assets-registry/registry'],
        output: {
          manualChunks: {
            // Vendor: React core
            'vendor-react': ['react', 'react-dom'],
            // Vendor: Supabase client + auth
            'vendor-supabase': ['@supabase/supabase-js'],
            // Vendor: Zustand state management
            'vendor-zustand': ['zustand'],
            // Vendor: Lucide icons (tree-shakeable but still large)
            'vendor-icons': ['lucide-react'],
            // Vendor: Form handling + validation
            'vendor-forms': ['react-hook-form', 'zod'],
          },
        },
      },
    },
  };
});
