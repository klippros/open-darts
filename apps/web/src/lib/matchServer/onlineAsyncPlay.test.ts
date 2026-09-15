import { describe, expect, it } from 'vitest'
import { GameModeId } from '@open-darts/game/types/gameMode'
import type { Visit } from '@open-darts/game/types/visit'
import { VisitInputMode } from '@open-darts/game/types/visit'
import {
  buildAsyncScoreboardOverlay,
  canAmendAsyncVisit,
  canPressAsyncUndo,
  canThrowInAsyncStream,
  getAsyncRemainingByPlayerId,
  getLastOwnAsyncVisit,
  mergeAsyncVisitHistory,
  parseAsyncPlayState,
  restoreAsyncEntryController,
  shouldClearAsyncLocalDraft,
} from './onlineAsyncPlay'
import type { AsyncPlayState, AsyncPlayerStream } from './onlineAsyncPlay'

const visit = (
  playerId: string,
  visitIndex: number,
  visitScore: number,
  overrides: Partial<Visit> = {},
): Visit => ({
  visitIndex,
  playerId,
  darts: [],
  visitScore,
  scoreBefore: 100 - visitIndex * visitScore,
  scoreAfter: 100 - (visitIndex + 1) * visitScore,
  bust: false,
  checkout: false,
  inputMode: VisitInputMode.VisitScore,
  ...overrides,
})

const stream = (overrides: Partial<AsyncPlayerStream> = {}): AsyncPlayerStream => ({
  visits: [],
  pendingFinalization: false,
  finalized: false,
  startScore: 100,
  finalizeAt: null,
  ...overrides,
})

const asyncPlay = (
  players: Record<string, AsyncPlayerStream>,
  dartsOwnerId = 'user-a',
): AsyncPlayState => ({
  dartsOwnerId,
  players,
})

describe('onlineAsyncPlay helpers', () => {
  it('parses asyncStateJson into streams', () => {
    const parsed = parseAsyncPlayState(
      JSON.stringify(
        asyncPlay({
          'user-a': stream({ startScore: 80 }),
          'user-b': stream({ startScore: 60, visits: [visit('user-b', 0, 20)] }),
        }),
      ),
    )

    expect(parsed?.dartsOwnerId).toBe('user-a')
    expect(parsed?.players['user-a']?.startScore).toBe(80)
    expect(parsed?.players['user-b']?.visits).toHaveLength(1)
  })

  it('returns null for invalid asyncStateJson', () => {
    expect(parseAsyncPlayState(null)).toBeNull()
    expect(parseAsyncPlayState('{')).toBeNull()
    expect(
      parseAsyncPlayState(JSON.stringify({ dartsOwnerId: 'a', players: { a: {} } })),
    ).toBeNull()
  })

  it('gates throwing on own stream finalization state', () => {
    expect(
      canThrowInAsyncStream({
        matchActive: true,
        stream: stream(),
      }),
    ).toBe(true)

    expect(
      canThrowInAsyncStream({
        matchActive: true,
        stream: stream({ pendingFinalization: true }),
      }),
    ).toBe(false)

    expect(
      canThrowInAsyncStream({
        matchActive: true,
        stream: stream({ finalized: true }),
      }),
    ).toBe(false)

    expect(
      canThrowInAsyncStream({
        matchActive: false,
        stream: stream(),
      }),
    ).toBe(false)
  })

  it('allows amending any async visit while the stream is still open', () => {
    const lastOwnVisit = visit('user-a', 0, 20)

    expect(
      canAmendAsyncVisit({
        matchActive: true,
        stream: stream({ visits: [lastOwnVisit] }),
        pendingDartCount: 0,
        lastOwnVisit,
      }),
    ).toBe(true)

    expect(
      canAmendAsyncVisit({
        matchActive: true,
        stream: stream({ pendingFinalization: true, visits: [lastOwnVisit] }),
        pendingDartCount: 0,
        lastOwnVisit,
      }),
    ).toBe(false)
  })

  it('enables async undo for pending darts, open stream visits, and own finalize', () => {
    expect(
      canPressAsyncUndo({
        pendingDartCount: 1,
        canAmend: false,
        ownPendingFinalization: false,
        hasLastOwnVisit: false,
      }),
    ).toBe(true)

    expect(
      canPressAsyncUndo({
        pendingDartCount: 0,
        canAmend: true,
        ownPendingFinalization: false,
        hasLastOwnVisit: true,
      }),
    ).toBe(true)

    expect(
      canPressAsyncUndo({
        pendingDartCount: 0,
        canAmend: false,
        ownPendingFinalization: true,
        hasLastOwnVisit: true,
      }),
    ).toBe(true)

    expect(
      canPressAsyncUndo({
        pendingDartCount: 0,
        canAmend: false,
        ownPendingFinalization: false,
        hasLastOwnVisit: true,
      }),
    ).toBe(false)
  })

  it('reads last own async visit from the stream only', () => {
    const streamVisits = [
      visit('user-a', 0, 20),
      visit('user-a', 1, 180, { voided: true }),
      visit('user-a', 2, 40),
    ]

    expect(getLastOwnAsyncVisit(stream({ visits: streamVisits }))).toMatchObject({
      visitIndex: 2,
      visitScore: 40,
    })
    expect(getLastOwnAsyncVisit(undefined)).toBeUndefined()
  })

  it('rebuilds a solo entry controller from startScore and stream visits', () => {
    const controller = restoreAsyncEntryController({
      matchId: 'match-1',
      mode: GameModeId.X01,
      config: { startScore: 501, doubleIn: false, doubleOut: true },
      playerId: 'user-a',
      playerName: 'Timon',
      stream: stream({
        startScore: 100,
        visits: [visit('user-a', 0, 40)],
      }),
    })

    expect(controller).not.toBeNull()
    expect(controller?.session.players).toHaveLength(1)
    expect(controller?.scoreboard.players[0]?.primaryScore).toBe(60)
    expect(controller?.activePlayerId).toBe('user-a')
  })

  it('computes remaining scores per player from async streams', () => {
    const remaining = getAsyncRemainingByPlayerId({
      matchId: 'match-1',
      mode: GameModeId.X01,
      config: { startScore: 501, doubleIn: false, doubleOut: true },
      asyncPlay: asyncPlay({
        'user-a': stream({ startScore: 100, visits: [visit('user-a', 0, 20)] }),
        'user-b': stream({ startScore: 80 }),
      }),
    })

    expect(remaining).toEqual({
      'user-a': 80,
      'user-b': 80,
    })
  })

  it('overlays remaining scores and marks the active thrower', () => {
    const overlay = buildAsyncScoreboardOverlay(
      {
        mode: GameModeId.X01,
        players: [
          {
            playerId: 'user-a',
            name: 'Timon',
            primaryScore: 501,
            isActive: false,
          },
          {
            playerId: 'user-b',
            name: 'Alex',
            primaryScore: 501,
            isActive: true,
          },
        ],
      },
      { 'user-a': 80, 'user-b': 60 },
      'user-a',
    )

    expect(overlay.players[0]).toMatchObject({
      playerId: 'user-a',
      primaryScore: 80,
      isActive: true,
    })
    expect(overlay.players[1]).toMatchObject({
      playerId: 'user-b',
      primaryScore: 60,
      isActive: false,
    })
  })

  it('merges sync and async visits with unique indexes and current leg', () => {
    const syncVisits = [
      visit('user-a', 0, 60, { legIndex: 1 }),
      visit('user-b', 1, 40, { legIndex: 1 }),
    ]
    const merged = mergeAsyncVisitHistory(
      syncVisits,
      asyncPlay({
        'user-a': stream({
          visits: [visit('user-a', 0, 20), visit('user-a', 1, 180, { voided: true })],
        }),
        'user-b': stream({ visits: [visit('user-b', 0, 15)] }),
      }),
      1,
    )

    expect(merged.map((entry) => entry.visitIndex)).toEqual([0, 1, 2, 3])
    expect(merged.map((entry) => entry.playerId)).toEqual(['user-a', 'user-b', 'user-a', 'user-b'])
    expect(merged.slice(2).every((entry) => entry.legIndex === 1)).toBe(true)
    expect(merged.some((entry) => entry.visitScore === 180)).toBe(false)
  })

  it('clears local async draft when the match ends or own stream is pending finalize', () => {
    expect(
      shouldClearAsyncLocalDraft({
        matchActive: true,
        ownPendingFinalization: false,
      }),
    ).toBe(false)

    expect(
      shouldClearAsyncLocalDraft({
        matchActive: true,
        ownPendingFinalization: true,
      }),
    ).toBe(true)

    expect(
      shouldClearAsyncLocalDraft({
        matchActive: false,
        ownPendingFinalization: false,
      }),
    ).toBe(true)
  })
})
