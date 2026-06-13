import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateCycleInput } from '@simplekanban/shared';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

export function useCreateCycle(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCycleInput) => api.teams.createCycle(teamId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.teamCycles(teamId) });
      toast.success('Cycle created');
    },
    onError: () => toast.error('Failed to create cycle'),
  });
}
