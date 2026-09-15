import type { DeadlineKind } from './types'
import { isDeadlineKind } from './types'

export const upsertDeadline = (sql: SqlStorage, kind: DeadlineKind, fireAt: number): void => {
  sql.exec(
    `
      INSERT INTO deadlines (kind, fire_at) VALUES (?, ?)
      ON CONFLICT(kind) DO UPDATE SET fire_at = excluded.fire_at
    `,
    kind,
    fireAt,
  )
}

export const deleteDeadline = (sql: SqlStorage, kind: DeadlineKind): void => {
  sql.exec('DELETE FROM deadlines WHERE kind = ?', kind)
}

export const deleteAllDeadlines = (sql: SqlStorage): void => {
  sql.exec('DELETE FROM deadlines')
}

export const earliestDeadline = (sql: SqlStorage): number | null => {
  const row = sql
    .exec<{ fire_at: number | null }>('SELECT MIN(fire_at) AS fire_at FROM deadlines')
    .one()

  return row.fire_at
}

export const dueDeadlineKinds = (sql: SqlStorage, now: number): DeadlineKind[] => {
  const rows = sql
    .exec<{ kind: string }>('SELECT kind FROM deadlines WHERE fire_at <= ?', now)
    .toArray()

  return rows.flatMap((row) => (isDeadlineKind(row.kind) ? [row.kind] : []))
}

export const scheduleEarliestAlarm = async (state: DurableObjectState): Promise<void> => {
  const next = earliestDeadline(state.storage.sql)

  if (next === null) {
    await state.storage.deleteAlarm()
    return
  }

  await state.storage.setAlarm(next)
}
