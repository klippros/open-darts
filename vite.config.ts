/// <reference types="vitest/config" />

import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/** LAN IPs are not secure contexts over HTTP, so getUserMedia / SpeechRecognition fail on phones. */
const exposeOnLan =
  process.argv.includes('--host') || process.argv.some((arg) => arg.startsWith('--host='))

// https://vite.dev/config/
export default defineConfig({
  base: '/tools/open-darts/',
  plugins: [react(), ...(exposeOnLan ? [basicSsl()] : [])],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
