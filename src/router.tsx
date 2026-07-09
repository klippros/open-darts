import { createBrowserRouter } from 'react-router-dom'
import { App } from './App'
import { AboutPage } from './routes/AboutPage'
import { GamePage } from './routes/GamePage'
import { HistoryPage } from './routes/HistoryPage'
import { HomePage } from './routes/HomePage'
import { StatsPage } from './routes/StatsPage'
import { X01SetupPage } from './routes/X01SetupPage'

export const router = createBrowserRouter(
  [
    {
      element: <App />,
      children: [
        { index: true, element: <HomePage /> },
        { path: 'game', element: <GamePage /> },
        { path: 'game/setup', element: <X01SetupPage /> },
        { path: 'history', element: <HistoryPage /> },
        { path: 'stats', element: <StatsPage /> },
        { path: 'about', element: <AboutPage /> },
      ],
    },
  ],
  { basename: '/tools/open-darts' },
)
