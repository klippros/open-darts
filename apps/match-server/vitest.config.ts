import { cloudflareTest } from '@cloudflare/vitest-plugin'
import { defineConfig } from 'vitest/config'
import { TEST_SUPABASE_JWT_SECRET } from './test/secrets'

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.jsonc' },
      miniflare: {
        bindings: {
          SUPABASE_URL: 'http://example.invalid',
          SUPABASE_JWT_SECRET: TEST_SUPABASE_JWT_SECRET,
          SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
        },
      },
    }),
  ],
})
