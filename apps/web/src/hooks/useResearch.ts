import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { startResearch } from '../lib/api';

export function useResearch() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function beginResearch(objective: string) {
    if (!objective.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const { session_id } = await startResearch(objective.trim());
      navigate(`/research/${session_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start research. Please try again.');
      setIsLoading(false);
    }
  }

  return { beginResearch, isLoading, error };
}
