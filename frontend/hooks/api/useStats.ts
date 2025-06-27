import { useQuery } from '@tanstack/react-query'
import { statsApi } from '@/lib/api/stats'

export function useStats() {
  return useQuery({
    queryKey: ['stats', 'overview'],
    queryFn: () => statsApi.getOverview(),
    staleTime: 1000 * 60 * 5,
  })
}

