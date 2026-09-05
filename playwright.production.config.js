import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir:'./tests/production',timeout:60000,forbidOnly:true,outputDir:'test-results/pwa',
  reporter:[['list'],['json',{outputFile:'test-results/pwa-summary.json'}]],
  use:{baseURL:'http://127.0.0.1:4174',timezoneId:'Asia/Shanghai',trace:'retain-on-failure',screenshot:'only-on-failure'},
  webServer:{command:'npm run build && npm run preview -- --host 127.0.0.1 --port 4174',url:'http://127.0.0.1:4174/bedtime/',reuseExistingServer:false},
  projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],
})
