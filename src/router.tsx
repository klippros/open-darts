import { createBrowserRouter } from 'react-router-dom'
import { App } from './App'
import { MatchAbortProvider } from './context/MatchAbortProvider'
import { AboutPage } from './routes/AboutPage'
import { GamePage } from './routes/GamePage'
import { HomePage } from './routes/HomePage'
import { X01SetupPage } from './routes/X01SetupPage'

export const router = createBrowserRouter(
  [
    {
      element: (
        <MatchAbortProvider>
          <App />
        </MatchAbortProvider>
      ),
      children: [
        { index: true, element: <HomePage /> },
        { path: 'game', element: <GamePage /> },
        { path: 'game/setup', element: <X01SetupPage /> },
        { path: 'about', element: <AboutPage /> },
      ],
    },
  ],
  { basename: '/tools/open-darts' },
)
