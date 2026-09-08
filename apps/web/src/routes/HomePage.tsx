import { Box, Stack } from '@chakra-ui/react'
import { ContentContainer } from '../components/ContentContainer'
import { HomePageMatchSection } from '../components/HomePage/HomePageMatchSection'
import { HomePageOnlineSection } from '../components/HomePage/HomePageOnlineSection'
import { HomePagePracticeSection } from '../components/HomePage/HomePagePracticeSection'
import { ResumeGameBanner } from '../components/ResumeGameBanner/ResumeGameBanner'
import { useInProgressOnlineMatch } from '../hooks/useInProgressOnlineMatch'

export const HomePage = () => {
  const inProgress = useInProgressOnlineMatch()
  const resumeMatch = inProgress.status === 'ready' ? inProgress.match : null

  return (
    <ContentContainer>
      <Box py={{ base: 6, md: 10 }} pb={10}>
        <Stack gap={8}>
          <ResumeGameBanner />
          <HomePageOnlineSection resumeMatch={resumeMatch} />
          <HomePageMatchSection />
          <HomePagePracticeSection />
        </Stack>
      </Box>
    </ContentContainer>
  )
}
