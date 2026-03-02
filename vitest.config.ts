import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    // Default environment for component/unit tests
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: [
      'tests/**/*.test.ts',
      'tests/**/*.spec.ts',
      'src/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: ['e2e/**', 'dist/**', 'mobile/**', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['services/**', 'src/**'],
      exclude: [
        'src/lib/**',
        '**/*.d.ts',
        '**/node_modules/**',
        'dist/**',
        'mobile/**',
        'e2e/**',
        'test/**',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
});
