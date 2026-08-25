import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/production',
  timeout: 30000,
  expect: { timeout: 7000 },
  use: {
    baseURL: 'http://127.0.0.1:4174',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4174',
    url: 'http://127.0.0.1:4174/bedtime/',
    reuseExistingServer: true,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
