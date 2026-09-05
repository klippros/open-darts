import { Flex } from '@chakra-ui/react'
import { faTrophy } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export interface MatchSummaryTitleProps {
  title: string
}

const showWinnerTrophy = (title: string): boolean =>
  title.endsWith(' wins') || title === 'Match won!' || title === 'Game shot!'

export const MatchSummaryTitle = ({ title }: MatchSummaryTitleProps) => (
  <Flex align="center" gap={2}>
    {showWinnerTrophy(title) && <FontAwesomeIcon icon={faTrophy} aria-hidden />}
    {title}
  </Flex>
)
