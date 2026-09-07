import { GameModeId } from '@open-darts/game/types/gameMode'
import type { JsonObject } from '../json'
import { isJsonObject } from '../json'
import { MatchEndingKind, MatchStatus, PlayMode, isDeadlineKind } from './types'
import type { MatchDeadlineSnapshot, MatchPlayerSnapshot, PublicMatchState } from './types'

interface MatchRow {
  id: string
  creator_user_id: string
  status: string
  play_mode: string
  mode: string
  config_json: string
  legs_to_win: number
  starting_player_slot: number
  created_at: number
  updated_at: number
  started_at: number | null
  session_json: string | null
  ending_kind: string | null
  winner_user_id: string | null
  invite_token: string
  version: number
  [column: string]: string | number | null
}

interface PlayerRow {
  user_id: string
  slot: number
  joined_at: number
  abandoned_at: number | null
  connected: number
  last_seen_at: number | null
  [column: string]: string | number | null
}

interface DeadlineRow {
  kind: string
  fire_at: number
  [column: string]: string | number | null
}

export const migrateMatchSchema = (sql: SqlStorage): void => {
  sql.exec(`
    CREATE TABLE IF NOT EXISTS _sql_schema_migrations (
      id INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL
    )
  `)

  const version = sql
    .exec<{ version: number }>('SELECT COALESCE(MAX(id), 0) AS version FROM _sql_schema_migrations')
    .one().version

  if (version < 1) {
    sql.exec(`
      CREATE TABLE match_state (
        id TEXT PRIMARY KEY,
        creator_user_id TEXT NOT NULL,
        status TEXT NOT NULL,
        play_mode TEXT NOT NULL,
        mode TEXT NOT NULL,
        config_json TEXT NOT NULL,
        legs_to_win INTEGER NOT NULL,
        starting_player_slot INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        started_at INTEGER,
        session_json TEXT,
        ending_kind TEXT,
        winner_user_id TEXT,
        version INTEGER NOT NULL
      )
    `)
    sql.exec(`
      CREATE TABLE match_players (
        user_id TEXT PRIMARY KEY,
        slot INTEGER NOT NULL UNIQUE,
        joined_at INTEGER NOT NULL,
        abandoned_at INTEGER,
        connected INTEGER NOT NULL,
        last_seen_at INTEGER
      )
    `)
    sql.exec(`
      CREATE TABLE deadlines (
        kind TEXT PRIMARY KEY,
        fire_at INTEGER NOT NULL
      )
    `)
    sql.exec('INSERT INTO _sql_schema_migrations (id, applied_at) VALUES (1, ?)', Date.now())
  }

  if (version < 2) {
    sql.exec('ALTER TABLE match_state ADD COLUMN invite_token TEXT NOT NULL DEFAULT ""')
    sql.exec('INSERT INTO _sql_schema_migrations (id, applied_at) VALUES (2, ?)', Date.now())
  }
}

const isGameModeId = (value: string): value is GameModeId =>
  (Object.values(GameModeId) as string[]).includes(value)

const isMatchStatus = (value: string): value is MatchStatus =>
  (Object.values(MatchStatus) as string[]).includes(value)

const isPlayMode = (value: string): value is PlayMode =>
  (Object.values(PlayMode) as string[]).includes(value)

const isEndingKind = (value: string): value is MatchEndingKind =>
  (Object.values(MatchEndingKind) as string[]).includes(value)

const isSlot = (value: number): value is 0 | 1 => value === 0 || value === 1

const parseConfig = (configJson: string): JsonObject => {
  const parsed: unknown = JSON.parse(configJson)

  if (!isJsonObject(parsed)) {
    throw new Error('Stored match config is not an object')
  }

  return parsed
}

export const loadPublicMatchState = (sql: SqlStorage): PublicMatchState | null => {
  const match = sql.exec<MatchRow>('SELECT * FROM match_state LIMIT 1').toArray()[0]

  if (match === undefined) {
    return null
  }

  if (!isGameModeId(match.mode) || !isMatchStatus(match.status) || !isPlayMode(match.play_mode)) {
    throw new Error('Stored match has an invalid mode or status')
  }

  if (!isSlot(match.starting_player_slot)) {
    throw new Error('Stored match has an invalid starting slot')
  }

  const players = sql
    .exec<PlayerRow>('SELECT * FROM match_players ORDER BY slot ASC')
    .toArray()
    .map((player): MatchPlayerSnapshot => {
      if (!isSlot(player.slot)) {
        throw new Error('Stored player has an invalid slot')
      }

      return {
        userId: player.user_id,
        slot: player.slot,
        connected: player.connected === 1,
        lastSeenAt: player.last_seen_at,
      }
    })

  const deadlines = sql
    .exec<DeadlineRow>('SELECT * FROM deadlines ORDER BY fire_at ASC')
    .toArray()
    .map((deadline): MatchDeadlineSnapshot => {
      if (!isDeadlineKind(deadline.kind)) {
        throw new Error('Stored deadline has an invalid kind')
      }

      return { kind: deadline.kind, fireAt: deadline.fire_at }
    })

  return {
    matchId: match.id,
    inviteToken: match.invite_token,
    creatorUserId: match.creator_user_id,
    status: match.status,
    playMode: match.play_mode,
    mode: match.mode,
    config: parseConfig(match.config_json),
    legsToWin: match.legs_to_win,
    startingPlayerSlot: match.starting_player_slot,
    players,
    deadlines,
    endingKind:
      match.ending_kind !== null && isEndingKind(match.ending_kind) ? match.ending_kind : null,
    winnerUserId: match.winner_user_id,
    createdAt: match.created_at,
    startedAt: match.started_at,
    version: match.version,
  }
}

export const loadCreatorUserId = (sql: SqlStorage): string | null => {
  const row = sql
    .exec<{ creator_user_id: string }>('SELECT creator_user_id FROM match_state LIMIT 1')
    .toArray()[0]

  return row?.creator_user_id ?? null
}

export const matchExists = (sql: SqlStorage): boolean =>
  sql.exec<{ present: number }>('SELECT COUNT(*) AS present FROM match_state').one().present > 0

export const findPlayer = (sql: SqlStorage, userId: string): MatchPlayerSnapshot | null => {
  const row = sql
    .exec<PlayerRow>('SELECT * FROM match_players WHERE user_id = ?', userId)
    .toArray()[0]

  if (row === undefined || !isSlot(row.slot)) {
    return null
  }

  return {
    userId: row.user_id,
    slot: row.slot,
    connected: row.connected === 1,
    lastSeenAt: row.last_seen_at,
  }
}

export const findOpenSlot = (sql: SqlStorage): 0 | 1 | null => {
  const taken = new Set(
    sql
      .exec<{ slot: number }>('SELECT slot FROM match_players')
      .toArray()
      .map((row) => row.slot),
  )

  if (!taken.has(0)) {
    return 0
  }

  if (!taken.has(1)) {
    return 1
  }

  return null
}

export const deletePlayer = (sql: SqlStorage, userId: string): void => {
  sql.exec('DELETE FROM match_players WHERE user_id = ?', userId)
}
