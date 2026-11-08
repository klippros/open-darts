export const PENDING_INVITE_VISIBLE_LIMIT = 3

export const selectVisiblePendingInvites = <T>(
  invites: readonly T[],
  expanded: boolean,
  limit = PENDING_INVITE_VISIBLE_LIMIT,
): { visible: T[]; hiddenCount: number } => {
  if (expanded || invites.length <= limit) {
    return { visible: [...invites], hiddenCount: 0 }
  }

  return {
    visible: invites.slice(0, limit),
    hiddenCount: invites.length - limit,
  }
}
