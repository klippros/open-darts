import { PlayerKind } from '../../types/player'

export const createId = (): string => crypto.randomUUID()

export const createPlayer = (
  name: string,
  kind: PlayerKind = PlayerKind.Human,
  id = createId(),
) => ({
  id,
  name,
  kind,
})

export const createSoloHumanPlayer = (name = 'Player 1') => createPlayer(name, PlayerKind.Human)
