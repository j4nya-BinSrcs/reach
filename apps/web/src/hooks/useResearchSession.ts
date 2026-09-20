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

  // Fetch full session data once research is complete
  const sessionQuery = useQuery({
    queryKey: ['research-session', sessionId],
    queryFn: () => getResearchSession(sessionId),
    enabled: isComplete,
    staleTime: Infinity, // session data is immutable once complete
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
