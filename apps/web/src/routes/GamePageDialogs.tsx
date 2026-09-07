import { AbortMatchDialog } from '../components/AbortMatchDialog/AbortMatchDialog'
import { MatchSummaryDialog } from '../components/MatchSummaryDialog/MatchSummaryDialog'
import { ResumeGameDialog } from '../components/ResumeGameDialog/ResumeGameDialog'
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
  onPlayAgain: () => void
  onUndoLastDart: () => void
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
  onPlayAgain,
  onUndoLastDart,
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
        onPlayAgain={onPlayAgain}
        onUndoLastDart={onUndoLastDart}
      />
    )}
  </>
)
