import { createBrowserRouter } from 'react-router-dom'
import { App } from './App'
import { AboutPage } from './routes/AboutPage'
import { GamePage } from './routes/GamePage'
import { HomePage } from './routes/HomePage'
import { X01SetupPage } from './routes/X01SetupPage'

export const router = createBrowserRouter(
  [
    {
      element: <App />,
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
