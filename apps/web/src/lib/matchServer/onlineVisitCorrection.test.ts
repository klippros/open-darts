import { describe, expect, it } from 'vitest'
import { GameModeId } from '@open-darts/game/types/gameMode'
import { VisitInputMode } from '@open-darts/game/types/visit'
import type { Visit } from '@open-darts/game/types/visit'
import { VoiceIntentKind } from '../voice/parseVoiceCommand'
import {
  AmendOwnVisitKind,
  AmendOwnVisitVoiceActionKind,
  canAmendLastOwnVisit,
  canPressOnlineUndo,
  getLastOwnCountingVisit,
  hasLaterOpponentVisit,
  mergeCorrectionScoreboard,
  remainingDartsAfterPeelingLast,
  resolveAmendOwnVisitKind,
  resolveAmendOwnVisitVoiceAction,
  shouldClearOnlineLocalDraft,
  visitsWithCorrectionRemoved,
} from './onlineVisitCorrection'

const visit = (overrides: Partial<Visit> & Pick<Visit, 'visitIndex' | 'playerId'>): Visit => ({
  darts: [],
  visitScore: 0,
  scoreBefore: 501,
  scoreAfter: 501,
  bust: false,
  checkout: false,
  inputMode: VisitInputMode.VisitScore,
  ...overrides,
})

describe('onlineVisitCorrection helpers', () => {
  it('finds the last own counting visit and detects later opponent throws', () => {
    const visits = [
      visit({ visitIndex: 0, playerId: 'a', visitScore: 60, scoreAfter: 441 }),
      visit({ visitIndex: 1, playerId: 'b', visitScore: 40, scoreAfter: 461 }),
      visit({ visitIndex: 2, playerId: 'a', visitScore: 20, scoreAfter: 421, voided: true }),
    ]

    expect(getLastOwnCountingVisit(visits, 'a')).toMatchObject({ visitIndex: 0 })
    expect(hasLaterOpponentVisit(visits, 0, 'a')).toBe(true)
    expect(hasLaterOpponentVisit(visits, 1, 'b')).toBe(false)
  })

  it('resolves amend to undo_visit or enter correction', () => {
    const own = visit({ visitIndex: 0, playerId: 'a' })
    const withOpponent = [own, visit({ visitIndex: 1, playerId: 'b' })]

    expect(resolveAmendOwnVisitKind([own], own, 'a')).toBe(AmendOwnVisitKind.UndoVisit)
    expect(resolveAmendOwnVisitKind(withOpponent, own, 'a')).toBe(AmendOwnVisitKind.EnterCorrection)
  })

  it('gates canAmendLastOwnVisit', () => {
    const lastOwnVisit = visit({ visitIndex: 0, playerId: 'a' })

    expect(
      canAmendLastOwnVisit({
        isActiveMatch: true,
        pendingFinalization: false,
        pendingDartCount: 0,
        lastOwnVisit,
        hasFullyUndoneVisitThisTurn: false,
      }),
    ).toBe(true)

    expect(
      canAmendLastOwnVisit({
        isActiveMatch: true,
        pendingFinalization: false,
        pendingDartCount: 1,
        lastOwnVisit,
        hasFullyUndoneVisitThisTurn: false,
      }),
    ).toBe(false)

    expect(
      canAmendLastOwnVisit({
        isActiveMatch: true,
        pendingFinalization: false,
        pendingDartCount: 0,
        lastOwnVisit,
        hasFullyUndoneVisitThisTurn: true,
      }),
    ).toBe(false)
  })

  it('only enables undo when a peel or single-visit amend is possible', () => {
    expect(
      canPressOnlineUndo({
        pendingDartCount: 1,
        isCorrecting: false,
        correctionStartedEmpty: false,
        canAmendLastVisit: false,
        pendingFinalization: false,
        hasLastOwnVisit: false,
      }),
    ).toBe(true)

    expect(
      canPressOnlineUndo({
        pendingDartCount: 0,
        isCorrecting: true,
        correctionStartedEmpty: false,
        canAmendLastVisit: false,
        pendingFinalization: false,
        hasLastOwnVisit: true,
      }),
    ).toBe(false)

    expect(
      canPressOnlineUndo({
        pendingDartCount: 0,
        isCorrecting: true,
        correctionStartedEmpty: true,
        canAmendLastVisit: false,
        pendingFinalization: false,
        hasLastOwnVisit: true,
      }),
    ).toBe(true)

    expect(
      canPressOnlineUndo({
        pendingDartCount: 0,
        isCorrecting: false,
        correctionStartedEmpty: false,
        canAmendLastVisit: false,
        pendingFinalization: false,
        hasLastOwnVisit: true,
      }),
    ).toBe(false)

    expect(
      canPressOnlineUndo({
        pendingDartCount: 0,
        isCorrecting: false,
        correctionStartedEmpty: false,
        canAmendLastVisit: true,
        pendingFinalization: false,
        hasLastOwnVisit: true,
      }),
    ).toBe(true)
  })

  it('maps amend voice undo and fix intents', () => {
    const own = visit({ visitIndex: 0, playerId: 'a' })
    const withOpponent = [own, visit({ visitIndex: 1, playerId: 'b' })]

    expect(
      resolveAmendOwnVisitVoiceAction({
        intent: { kind: VoiceIntentKind.Undo },
        visits: [own],
        playerId: 'a',
        lastOwnVisit: own,
      }),
    ).toEqual({ kind: AmendOwnVisitVoiceActionKind.UndoVisit })

    expect(
      resolveAmendOwnVisitVoiceAction({
        intent: { kind: VoiceIntentKind.Undo },
        visits: withOpponent,
        playerId: 'a',
        lastOwnVisit: own,
      }),
    ).toEqual({ kind: AmendOwnVisitVoiceActionKind.EnterCorrection })

    expect(
      resolveAmendOwnVisitVoiceAction({
        intent: {
          kind: VoiceIntentKind.Fix,
          inner: { kind: VoiceIntentKind.VisitScore, score: 60 },
        },
        visits: withOpponent,
        playerId: 'a',
        lastOwnVisit: own,
      }),
    ).toEqual({
      kind: AmendOwnVisitVoiceActionKind.CorrectVisitScore,
      visitIndex: 0,
      visitScore: 60,
    })

    expect(
      resolveAmendOwnVisitVoiceAction({
        intent: {
          kind: VoiceIntentKind.Fix,
          inner: { kind: VoiceIntentKind.VisitScore, score: 60 },
        },
        visits: [own],
        playerId: 'a',
        lastOwnVisit: own,
      }),
    ).toEqual({ kind: AmendOwnVisitVoiceActionKind.UndoVisit })
  })

  it('keeps local draft when turn leaves due to an opponent amend', () => {
    const visits = [visit({ visitIndex: 0, playerId: 'a' })]

    expect(
      shouldClearOnlineLocalDraft({
        correctingVisitIndex: null,
        visits,
        matchActive: true,
        pendingFinalization: false,
      }),
    ).toBe(false)

    expect(
      shouldClearOnlineLocalDraft({
        correctingVisitIndex: 0,
        visits,
        matchActive: true,
        pendingFinalization: false,
      }),
    ).toBe(false)

    expect(
      shouldClearOnlineLocalDraft({
        correctingVisitIndex: 0,
        visits: [{ ...visits[0]!, voided: true }],
        matchActive: true,
        pendingFinalization: false,
      }),
    ).toBe(true)

    expect(
      shouldClearOnlineLocalDraft({
        correctingVisitIndex: null,
        visits,
        matchActive: true,
        pendingFinalization: true,
      }),
    ).toBe(true)
  })

  it('peels only the last dart from a committed per-dart visit', () => {
    const darts = [{ points: 20 }, { points: 5 }, { points: 1 }] as Visit['darts']

    expect(
      remainingDartsAfterPeelingLast(
        visit({
          visitIndex: 0,
          playerId: 'a',
          darts,
          inputMode: VisitInputMode.PerDart,
        }),
      ),
    ).toEqual([darts[0], darts[1]])

    expect(
      remainingDartsAfterPeelingLast(
        visit({
          visitIndex: 0,
          playerId: 'a',
          darts: [darts[0]!],
          inputMode: VisitInputMode.PerDart,
        }),
      ),
    ).toEqual([])

    expect(
      remainingDartsAfterPeelingLast(
        visit({
          visitIndex: 0,
          playerId: 'a',
          darts: [],
          visitScore: 60,
          inputMode: VisitInputMode.VisitScore,
        }),
      ),
    ).toEqual([])
  })

  it('removes only the correcting visit from history and merges scoreboards', () => {
    const visits = [
      visit({ visitIndex: 0, playerId: 'a' }),
      visit({ visitIndex: 1, playerId: 'b' }),
    ]

    expect(visitsWithCorrectionRemoved(visits, 0)).toEqual([visits[1]])

    expect(
      mergeCorrectionScoreboard(
        {
          mode: GameModeId.X01,
          players: [
            {
              playerId: 'a',
              name: 'A',
              primaryScore: 441,
              isActive: true,
            },
            {
              playerId: 'b',
              name: 'B',
              primaryScore: 501,
              isActive: false,
            },
          ],
        },
        {
          mode: GameModeId.X01,
          players: [
            {
              playerId: 'a',
              name: 'A',
              primaryScore: 401,
              isActive: false,
            },
            {
              playerId: 'b',
              name: 'B',
              primaryScore: 461,
              isActive: true,
            },
          ],
        },
        'a',
      ),
    ).toEqual({
      mode: GameModeId.X01,
      players: [
        {
          playerId: 'a',
          name: 'A',
          primaryScore: 441,
          isActive: true,
        },
        {
          playerId: 'b',
          name: 'B',
          primaryScore: 461,
          isActive: false,
        },
      ],
    })
  })
})
