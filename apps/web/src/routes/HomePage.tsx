import { Box, Stack } from '@chakra-ui/react'
import { ContentContainer } from '../components/ContentContainer'
import { HomePageMatchSection } from '../components/HomePage/HomePageMatchSection'
import { HomePagePracticeSection } from '../components/HomePage/HomePagePracticeSection'
import { ResumeGameBanner } from '../components/ResumeGameBanner/ResumeGameBanner'
import { ResumeOnlineMatchBanner } from '../components/ResumeOnlineMatchBanner/ResumeOnlineMatchBanner'
import { useInProgressOnlineMatch } from '../hooks/useInProgressOnlineMatch'

export const HomePage = () => {
  const inProgress = useInProgressOnlineMatch()
  const resumeMatch =
    inProgress.status === 'ready' || inProgress.status === 'loading' ? inProgress.match : null

  return (
    <ContentContainer>
      <Box py={{ base: 6, md: 10 }} pb={10}>
        <Stack gap={8}>
          <ResumeGameBanner />
          {resumeMatch !== null ? (
            <ResumeOnlineMatchBanner
              match={resumeMatch}
              onCancelled={() => {
                inProgress.dismissCancelledMatch(resumeMatch.id)
              }}
            />
          ) : null}
          <HomePageMatchSection />
          <HomePagePracticeSection />
        </Stack>
      </Box>
    </ContentContainer>
  )
}
