import { ChakraProvider, Theme } from '@chakra-ui/react'
import { system } from './theme'
import { config } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from './router.tsx'

config.autoAddCss = false

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ChakraProvider value={system}>
      <Theme appearance="dark" hasBackground={false}>
        <RouterProvider router={router} />
      </Theme>
    </ChakraProvider>
  </StrictMode>,
)
