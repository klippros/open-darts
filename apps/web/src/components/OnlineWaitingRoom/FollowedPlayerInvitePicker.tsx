import { Box, Button, Input, Stack, Text } from '@chakra-ui/react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useEffect, useEffectEvent, useId, useRef, useState } from 'react'
import { ComboboxKey, nextComboboxActiveIndex } from '../../lib/social/comboboxKeyboard'
import {
  createOnlineMatchInvite,
  InviteApiError,
  listFollowedPlayersForInvite,
} from '../../lib/social/inviteApi'
import { formatInvitePlayerMeta } from '../../lib/social/formatInvitePlayerMeta'
import { createRequestGeneration } from '../../lib/social/requestGeneration'
import type { FollowedPlayerForInvite, OnlineMatchInviteHostRow } from '../../lib/social/types'

export interface FollowedPlayerInvitePickerProps {
  matchId: string
  disabled?: boolean
  onInvited: (invite: OnlineMatchInviteHostRow) => void
}

const PAGE_SIZE = 50
const ROW_HEIGHT = 56

export const FollowedPlayerInvitePicker = ({
  matchId,
  disabled = false,
  onInvited,
}: FollowedPlayerInvitePickerProps) => {
  const listboxId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [players, setPlayers] = useState<FollowedPlayerForInvite[]>([])
  const [rankedAt, setRankedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const parentRef = useRef<HTMLDivElement | null>(null)
  const requestGenerationRef = useRef(createRequestGeneration())
  const inviteGenerationRef = useRef(createRequestGeneration())

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, 200)
    return () => {
      window.clearTimeout(handle)
    }
  }, [query])

  const loadPage = useEffectEvent(
    async (options: { reset: boolean; rankedAtValue: string | null }) => {
      const requestId = requestGenerationRef.current.next()
      if (options.reset) {
        setLoading(true)
        setError(null)
      } else {
        setLoadingMore(true)
      }

      try {
        const last = options.reset ? undefined : players.at(-1)
        const page = await listFollowedPlayersForInvite({
          query: debouncedQuery.length > 0 ? debouncedQuery : undefined,
          limit: PAGE_SIZE,
          rankedAt: options.rankedAtValue ?? undefined,
          afterRelevanceScore: last?.relevanceScore,
          afterDisplayName: last?.displayName,
          afterUserId: last?.userId,
        })

        if (!requestGenerationRef.current.isCurrent(requestId)) {
          return
        }

        const nextRankedAt = page[0]?.rankedAt ?? options.rankedAtValue
        setRankedAt(nextRankedAt)
        setPlayers((current) => (options.reset ? page : [...current, ...page]))
        setHasMore(page.length === PAGE_SIZE)
        setActiveIndex(0)
      } catch (loadError) {
        if (!requestGenerationRef.current.isCurrent(requestId)) {
          return
        }
        setError(
          loadError instanceof InviteApiError
            ? loadError.message
            : 'Unable to load followed players.',
        )
      } finally {
        if (requestGenerationRef.current.isCurrent(requestId)) {
          setLoading(false)
          setLoadingMore(false)
        }
      }
    },
  )

  useEffect(() => {
    requestGenerationRef.current.invalidate()
    inviteGenerationRef.current.invalidate()
    setPlayers([])
    setRankedAt(null)
    setHasMore(false)
    setActiveIndex(0)
    setError(null)
    setInvitingUserId(null)
  }, [matchId])

  useEffect(() => {
    if (!open || disabled) {
      return
    }

    void loadPage({ reset: true, rankedAtValue: null })
  }, [open, disabled, debouncedQuery, matchId])

  const virtualizer = useVirtualizer({
    count: players.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 8,
  })

  useEffect(() => {
    const items = virtualizer.getVirtualItems()
    const last = items.at(-1)
    if (last === undefined || loadingMore || !hasMore || loading) {
      return
    }

    if (last.index >= players.length - 8) {
      void loadPage({ reset: false, rankedAtValue: rankedAt })
    }
  }, [virtualizer, players.length, loadingMore, hasMore, loading, rankedAt])

  useEffect(() => {
    if (!open || players.length === 0) {
      return
    }
    virtualizer.scrollToIndex(activeIndex, { align: 'auto' })
  }, [activeIndex, open, players.length, virtualizer])

  const invitePlayer = async (player: FollowedPlayerForInvite) => {
    if (invitingUserId !== null || disabled) {
      return
    }

    const requestId = inviteGenerationRef.current.next()
    setInvitingUserId(player.userId)
    setError(null)

    try {
      const invite = await createOnlineMatchInvite(matchId, player.userId)
      if (!inviteGenerationRef.current.isCurrent(requestId)) {
        return
      }
      onInvited(invite)
      setOpen(false)
      setQuery('')
    } catch (inviteError) {
      if (!inviteGenerationRef.current.isCurrent(requestId)) {
        return
      }
      setError(
        inviteError instanceof InviteApiError ? inviteError.message : 'Unable to send invite.',
      )
    } finally {
      if (inviteGenerationRef.current.isCurrent(requestId)) {
        setInvitingUserId(null)
      }
    }
  }

  const activeOptionId =
    players[activeIndex] === undefined
      ? undefined
      : `${listboxId}-option-${players[activeIndex].userId}`

  return (
    <Stack gap={2} w="full">
      <Button
        variant="cancel"
        disabled={disabled}
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => {
          setOpen((current) => !current)
        }}
      >
        {open ? 'Hide players' : 'Invite player'}
      </Button>

      {open ? (
        <Stack
          gap={2}
          borderWidth="1px"
          borderColor="whiteAlpha.200"
          borderRadius="lg"
          bg="blackAlpha.400"
          p={3}
        >
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
            }}
            placeholder="Search by display name"
            autoComplete="off"
            role="combobox"
            tabIndex={0}
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeOptionId}
            onKeyDown={(event) => {
              const key = event.key
              if (key === ComboboxKey.ArrowDown || key === ComboboxKey.ArrowUp) {
                event.preventDefault()
                setActiveIndex((current) => nextComboboxActiveIndex(current, key, players.length))
              }
              if (key === ComboboxKey.Enter) {
                const selected = players[activeIndex]
                if (selected !== undefined) {
                  event.preventDefault()
                  void invitePlayer(selected)
                }
              }
              if (key === ComboboxKey.Escape) {
                event.preventDefault()
                setOpen(false)
              }
            }}
          />

          {loading ? <Text color="whiteAlpha.700">Loading…</Text> : null}
          {!loading && players.length === 0 ? (
            <Text color="whiteAlpha.700" fontSize="sm">
              Follow players from their profiles or history to invite them here.
            </Text>
          ) : null}

          {players.length > 0 ? (
            <Box
              id={listboxId}
              ref={parentRef}
              maxH="240px"
              overflowY="auto"
              role="listbox"
              aria-label="Followed players"
            >
              <Box height={`${String(virtualizer.getTotalSize())}px`} position="relative" w="full">
                {virtualizer.getVirtualItems().map((item) => {
                  const player = players[item.index]
                  if (player === undefined) {
                    return null
                  }

                  const active = item.index === activeIndex
                  const optionId = `${listboxId}-option-${player.userId}`

                  return (
                    <Box
                      key={player.userId}
                      id={optionId}
                      position="absolute"
                      top={0}
                      left={0}
                      w="full"
                      transform={`translateY(${String(item.start)}px)`}
                      height={`${String(item.size)}px`}
                    >
                      <Button
                        variant="ghost"
                        w="full"
                        h="full"
                        justifyContent="flex-start"
                        px={3}
                        borderRadius="md"
                        bg={active ? 'whiteAlpha.200' : 'transparent'}
                        role="option"
                        aria-selected={active}
                        disabled={invitingUserId !== null}
                        onMouseEnter={() => {
                          setActiveIndex(item.index)
                        }}
                        onClick={() => {
                          void invitePlayer(player)
                        }}
                      >
                        <Stack gap={0} align="start">
                          <Text color="white" fontWeight="semibold">
                            {player.displayName}
                          </Text>
                          <Text color="whiteAlpha.600" fontSize="xs">
                            {formatInvitePlayerMeta(player.playCount, player.lastPlayedAt)}
                          </Text>
                        </Stack>
                      </Button>
                    </Box>
                  )
                })}
              </Box>
            </Box>
          ) : null}

          {loadingMore ? (
            <Text color="whiteAlpha.600" fontSize="xs">
              Loading more…
            </Text>
          ) : null}
        </Stack>
      ) : null}

      {error !== null ? (
        <Text color="red.300" fontSize="sm">
          {error}
        </Text>
      ) : null}
    </Stack>
  )
}
