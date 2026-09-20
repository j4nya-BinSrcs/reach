import { useQuery } from '@tanstack/react-query';
import { getResearchStatus, getResearchSession } from '../lib/api';
import { POLL_INTERVAL_MS } from '../lib/constants';
import { isTerminalStatus } from '../lib/utils';

export function useResearchSession(sessionId: string) {
  // Poll status while research is running
  const statusQuery = useQuery({
    queryKey: ['research-status', sessionId],
    queryFn: () => getResearchStatus(sessionId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || isTerminalStatus(status)) return false;
      return POLL_INTERVAL_MS;
    },
    enabled: !!sessionId,
    staleTime: 0,
  });

  const isComplete = statusQuery.data?.status === 'complete';
  const isFailed   = statusQuery.data?.status === 'failed';

  // Fetch full session data. Once research is complete the payload is
  // immutable; while it is still running we stream the partial workspace so
  // sources appear as they are collected and unfinished areas render as
  // skeletons instead of placeholders.
  const sessionQuery = useQuery({
    queryKey: ['research-session', sessionId],
    queryFn: () => getResearchSession(sessionId),
    enabled: !!sessionId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || isTerminalStatus(status)) return false;
      return POLL_INTERVAL_MS;
    },
    staleTime: (query) => (query.state.data && isTerminalStatus(query.state.data.status) ? Infinity : 0),
  });

  return {
    progress: statusQuery.data,
    session: sessionQuery.data,
    isLoadingProgress: statusQuery.isPending,
    isLoadingSession: sessionQuery.isPending && isComplete,
    isComplete,
    isFailed,
    error: statusQuery.error ?? sessionQuery.error,
  };
}
