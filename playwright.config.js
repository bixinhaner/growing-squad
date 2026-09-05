import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir:'./tests/e2e',timeout:45000,expect:{timeout:10000},forbidOnly:true,retries:0,workers:2,
  outputDir:'test-results/e2e',
  reporter:[['list'],['json',{outputFile:'test-results/e2e-summary.json'}],['html',{outputFolder:'playwright-report/e2e',open:'never'}]],
  use:{baseURL:'http://127.0.0.1:4173',timezoneId:'Asia/Shanghai',trace:'retain-on-failure',screenshot:'only-on-failure'},
  webServer:{command:'VITE_DISABLE_CLOUD=true npm run dev -- --host 127.0.0.1 --port 4173',url:'http://127.0.0.1:4173/bedtime/',reuseExistingServer:false},
  projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],
})
