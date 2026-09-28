import { DeadlineKind, isDeadlineKind } from './types'

/** Lower number = processed first when multiple deadlines are due in one alarm wake. */
export const DEADLINE_KIND_PRIORITY: Record<DeadlineKind, number> = {
  [DeadlineKind.FinalizeAt]: 0,
  [DeadlineKind.AsyncDeadlineAt]: 1,
  [DeadlineKind.IdleExpiresAt]: 2,
  [DeadlineKind.WaitingExpiresAt]: 3,
}

export const compareDeadlineKindPriority = (left: DeadlineKind, right: DeadlineKind): number =>
  DEADLINE_KIND_PRIORITY[left] - DEADLINE_KIND_PRIORITY[right]

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

  return rows
    .flatMap((row) => (isDeadlineKind(row.kind) ? [row.kind] : []))
    .sort(compareDeadlineKindPriority)
}

export const scheduleEarliestAlarm = async (state: DurableObjectState): Promise<void> => {
  const next = earliestDeadline(state.storage.sql)

  if (next === null) {
    await state.storage.deleteAlarm()
    return
  }

  await state.storage.setAlarm(next)
}
