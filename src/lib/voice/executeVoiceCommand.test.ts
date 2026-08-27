import { describe, expect, it } from 'vitest'
import { DartMultiplier } from '../../types/dart'
import { GameModeId } from '../../types/gameMode'
import { PlayerKind } from '../../types/player'
import { X01InputMode } from '../../types/settings'
import { createGameController } from '../game/createSession'
import { createPlayer } from '../game/playerFactory'
import { numberDart } from '../testHelpers'
import { executeVoiceCommand } from './executeVoiceCommand'
import { parseVoiceCommand, VoiceIntentKind } from './parseVoiceCommand'
import { createVoiceUndoHistory } from './voiceUndoHistory'

const solo = createPlayer('Solo', PlayerKind.Human, 'solo')

const parse = (mode: GameModeId, transcript: string) => parseVoiceCommand(mode, transcript)

describe('voiceUndoHistory + executeVoiceCommand', () => {
  it('applies bob27 hit and undoes the visit', () => {
    const history = createVoiceUndoHistory()
    let controller = createGameController({ mode: GameModeId.Bob27, players: [solo] })

    const applied = executeVoiceCommand(controller, parse(GameModeId.Bob27, 'hit 1')!, history)!
    expect(applied.playback).toBe('hit')
    applied.commitHistory(history)
    controller = applied.next
    expect(controller.session.visits).toHaveLength(1)

    const undone = executeVoiceCommand(controller, { kind: VoiceIntentKind.Undo }, history)!
    undone.commitHistory(history)
    controller = undone.next
    expect(controller.session.visits).toHaveLength(0)
    expect(history.size()).toBe(0)
  })

  it('ignores voice undo after a manual action', () => {
    const history = createVoiceUndoHistory()
    let controller = createGameController({ mode: GameModeId.Bob27, players: [solo] })

    const applied = executeVoiceCommand(controller, parse(GameModeId.Bob27, 'hit 1')!, history)!
    applied.commitHistory(history)
    controller = applied.next.recordDart(numberDart(20, DartMultiplier.Double))

    expect(executeVoiceCommand(controller, { kind: VoiceIntentKind.Undo }, history)).toBeNull()
  })

  it('applies fix atomically and makes undo reverse the replacement', () => {
    const history = createVoiceUndoHistory()
    let controller = createGameController({ mode: GameModeId.Bob27, players: [solo] })

    const first = executeVoiceCommand(controller, parse(GameModeId.Bob27, 'hit 1')!, history)!
    first.commitHistory(history)
    controller = first.next

    const fixed = executeVoiceCommand(controller, parse(GameModeId.Bob27, 'fix hit 2')!, history)!
    fixed.commitHistory(history)
    controller = fixed.next
    expect(controller.session.visits).toHaveLength(1)
    expect(history.size()).toBe(1)

    const undone = executeVoiceCommand(controller, { kind: VoiceIntentKind.Undo }, history)!
    undone.commitHistory(history)
    controller = undone.next
    expect(controller.session.visits).toHaveLength(0)
  })

  it('returns null for ineligible fix when no voice history', () => {
    const history = createVoiceUndoHistory()
    const controller = createGameController({ mode: GameModeId.Bob27, players: [solo] })
    const withManual = controller.recordDart(numberDart(20, DartMultiplier.Double))

    expect(
      executeVoiceCommand(withManual, parse(GameModeId.Bob27, 'fix hit 2')!, history),
    ).toBeNull()
    expect(history.size()).toBe(0)
  })

  it('applies around-the-clock visit sequences and missed all', () => {
    const history = createVoiceUndoHistory()
    let controller = createGameController({
      mode: GameModeId.AroundTheClock,
      players: [solo],
    })

    const visit = executeVoiceCommand(
      controller,
      parse(GameModeId.AroundTheClock, 'hit hit miss')!,
      history,
    )!
    expect(visit.playback).toBe('hit')
    visit.commitHistory(history)
    controller = visit.next
    expect(controller.pendingDarts).toHaveLength(0)
    expect(controller.session.visits).toHaveLength(1)
    expect(controller.session.visits[0]?.darts).toHaveLength(3)

    expect(
      executeVoiceCommand(controller, parse(GameModeId.AroundTheClock, 'hit')!, history),
    ).toBeNull()
    expect(parse(GameModeId.AroundTheClock, 'hit two')).toBeNull()

    const missedAll = executeVoiceCommand(
      controller,
      parse(GameModeId.AroundTheClock, 'missed all')!,
      history,
    )!
    missedAll.commitHistory(history)
    controller = missedAll.next
    expect(controller.pendingDarts).toHaveLength(0)
    expect(controller.session.visits).toHaveLength(2)
  })

  it('rejects around-the-clock after the game is complete', () => {
    const history = createVoiceUndoHistory()
    let controller = createGameController({
      mode: GameModeId.AroundTheClock,
      players: [solo],
    })

    for (let i = 0; i < 21; i += 1) {
      const result = executeVoiceCommand(
        controller,
        parse(GameModeId.AroundTheClock, 'hit miss miss')!,
        history,
      )

      if (result === null) {
        const finish = executeVoiceCommand(
          controller,
          parse(GameModeId.AroundTheClock, 'hit')!,
          history,
        )

        if (finish === null) {
          break
        }

        finish.commitHistory(history)
        controller = finish.next
        break
      }

      result.commitHistory(history)
      controller = result.next

      if (controller.isComplete) {
        break
      }
    }

    expect(controller.isComplete).toBe(true)
    expect(
      executeVoiceCommand(controller, parse(GameModeId.AroundTheClock, 'hit miss miss')!, history),
    ).toBeNull()
  })

  it('applies and undoes X01 visit-score voice commands', () => {
    const history = createVoiceUndoHistory()
    let controller = createGameController({ mode: GameModeId.X01, players: [solo] })
    const options = { x01InputMode: X01InputMode.VisitScore }

    const applied = executeVoiceCommand(
      controller,
      parseVoiceCommand(GameModeId.X01, 'one hundred', options)!,
      history,
    )!
    expect(applied.playback).toBe('hit')
    applied.commitHistory(history)
    controller = applied.next
    expect(controller.session.visits).toHaveLength(1)
    expect(controller.session.visits[0]).toMatchObject({
      visitScore: 100,
      inputMode: 'visit-score',
    })
    expect(controller.scoreboard.players[0]?.primaryScore).toBe(401)

    const undone = executeVoiceCommand(controller, { kind: VoiceIntentKind.Undo }, history)!
    undone.commitHistory(history)
    controller = undone.next
    expect(controller.session.visits).toHaveLength(0)
    expect(controller.scoreboard.players[0]?.primaryScore).toBe(501)
  })
})
