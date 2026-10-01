import { GameModeId } from '@open-darts/game/types/gameMode'
import { buildX01PresetPath, X01PresetId } from '@open-darts/game/x01/x01Presets'
import { buildPracticeGamePath } from '../../lib/game/gameRoute'

export interface HomePageModeLink {
  id: string
  label: string
  description: string
  to: string
  onlineCapable?: boolean
}

export const MATCH_MODES: readonly HomePageModeLink[] = [
  {
    id: X01PresetId.FiveOhOne,
    label: '501',
    description: 'Classic double-out',
    to: buildX01PresetPath(X01PresetId.FiveOhOne),
    onlineCapable: true,
  },
  {
    id: X01PresetId.FourOhOne,
    label: '401',
    description: 'Shorter x01 leg',
    to: buildX01PresetPath(X01PresetId.FourOhOne),
  },
  {
    id: X01PresetId.ThreeOhOne,
    label: '301',
    description: 'Quick x01 leg',
    to: buildX01PresetPath(X01PresetId.ThreeOhOne),
  },
  {
    id: 'custom-x01',
    label: 'Custom x01',
    description: 'Choose start score and rules',
    to: '/game/setup',
  },
  {
    id: 'claim-the-board',
    label: 'Claim the Board',
    description: 'Shared targets · highest score wins · finish hits break ties',
    to: '/game/claim-the-board/setup',
    onlineCapable: true,
  },
  {
    id: 'hunter',
    label: 'Hunter',
    description: 'Chase around the board · land on or pass to win',
    to: '/game/hunter/setup',
    onlineCapable: true,
  },
]

export const PRACTICE_MODES: readonly HomePageModeLink[] = [
  {
    id: 'bob',
    label: "Bob's 27",
    description: 'Doubles practice',
    to: buildPracticeGamePath(GameModeId.Bob27),
  },
  {
    id: '121',
    label: '121',
    description: 'Lives ladder from 121',
    to: buildPracticeGamePath(GameModeId.OneTwentyOne),
  },
  {
    id: 'around-the-clock',
    label: 'Around the Clock',
    description: 'Hit 1 to 20; finish on 25/bull or bull',
    to: '/game/around-the-clock/setup',
  },
  {
    id: '10-up-1-down',
    label: '10 Up 1 Down',
    description: 'Checkout up or down',
    to: buildPracticeGamePath(GameModeId.TenUpOneDown),
  },
  {
    id: '99-darts',
    label: '99 Darts',
    description: '99 darts at a chosen target',
    to: '/game/99-darts/setup',
  },
]
