import { AbortMatchDialog } from '../components/AbortMatchDialog/AbortMatchDialog'
import { MatchSummaryDialog } from '../components/MatchSummaryDialog/MatchSummaryDialog'
import { ResumeGameDialog } from '../components/ResumeGameDialog/ResumeGameDialog'
import type { Account, CreateAccountInput } from '../types/account'
import type { GameSession } from '../types/gameSession'

export interface GamePageDialogsProps {
  resumeConflictSession: GameSession | null
  onResumeSaved: () => void
  onStartNew: () => void
  abortDialogOpen: boolean
  onAbortDialogOpenChange: (open: boolean) => void
  onConfirmAbortMatch: () => void
  showMatchSummary: boolean
  completedSession: GameSession | null
  account: Account | null
  onPlayAgain: () => void
  onUndoLastDart: () => void
  onCreateAccount: (input: CreateAccountInput) => string | null
}

export const GamePageDialogs = ({
  resumeConflictSession,
  onResumeSaved,
  onStartNew,
  abortDialogOpen,
  onAbortDialogOpenChange,
  onConfirmAbortMatch,
  showMatchSummary,
  completedSession,
  account,
  onPlayAgain,
  onUndoLastDart,
  onCreateAccount,
}: GamePageDialogsProps) => (
  <>
    {resumeConflictSession !== null && (
      <ResumeGameDialog
        open
        savedSession={resumeConflictSession}
        onResumeSaved={onResumeSaved}
        onStartNew={onStartNew}
      />
    )}

    <AbortMatchDialog
      open={abortDialogOpen}
      onOpenChange={onAbortDialogOpenChange}
      onConfirm={onConfirmAbortMatch}
    />

    {completedSession !== null && (
      <MatchSummaryDialog
        open={showMatchSummary}
        session={completedSession}
        account={account}
        onPlayAgain={onPlayAgain}
        onUndoLastDart={onUndoLastDart}
        onCreateAccount={onCreateAccount}
      />
    )}
  </>
)
