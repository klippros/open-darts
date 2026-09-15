import { createBrowserRouter } from 'react-router-dom'
import { App } from './App'
import { AboutPage } from './routes/AboutPage'
import { AroundTheClockSetupPage } from './routes/AroundTheClockSetupPage'
import { AuthCallbackPage } from './routes/AuthCallbackPage'
import { GamePage } from './routes/GamePage'
import { HistoryPage } from './routes/HistoryPage'
import { HomePage } from './routes/HomePage'
import { MatchSetupPage } from './routes/MatchSetupPage'
import { OnlineMatchJoinPage } from './routes/OnlineMatchJoinPage'
import { OnlineMatchNewPage } from './routes/OnlineMatchNewPage'
import { OnlineMatchPage } from './routes/OnlineMatchPage'
import { StatsPage } from './routes/StatsPage'
import { X01SetupPage } from './routes/X01SetupPage'

export const router = createBrowserRouter(
  [
    {
      element: <App />,
      children: [
        { index: true, element: <HomePage /> },
        { path: 'game', element: <GamePage /> },
        { path: 'game/match-setup', element: <MatchSetupPage /> },
        { path: 'game/setup', element: <X01SetupPage /> },
        { path: 'game/around-the-clock/setup', element: <AroundTheClockSetupPage /> },
        { path: 'match/new', element: <OnlineMatchNewPage /> },
        { path: 'match/join/:token', element: <OnlineMatchJoinPage /> },
        { path: 'match/:id', element: <OnlineMatchPage /> },
        { path: 'auth/callback', element: <AuthCallbackPage /> },
        { path: 'history', element: <HistoryPage /> },
        { path: 'stats', element: <StatsPage /> },
        { path: 'about', element: <AboutPage /> },
      ],
    },
  ],
  { basename: '/tools/open-darts' },
)
