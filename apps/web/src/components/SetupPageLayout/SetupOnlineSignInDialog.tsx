import { SignInDialog } from '../SignInDialog/SignInDialog'

export interface SetupOnlineSignInDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  returnTo: string
}

export const SetupOnlineSignInDialog = ({
  open,
  onOpenChange,
  returnTo,
}: SetupOnlineSignInDialogProps) => (
  <SignInDialog
    open={open}
    onOpenChange={onOpenChange}
    returnTo={returnTo}
    title="Sign in to play online"
    description="Online matches need a signed-in account. After you sign in, you can create a lobby and invite an opponent."
  />
)
