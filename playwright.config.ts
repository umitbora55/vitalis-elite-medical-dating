import { defineConfig, devices } from '@playwright/test';

const usePreviewServer = process.env.E2E_PREVIEW === '1';
const webServerCommand = usePreviewServer
  ? 'npm run preview -- --host 0.0.0.0 --port 4173 --strictPort'
  : 'npm run dev -- --host 0.0.0.0 --port 4173';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: webServerCommand,
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
