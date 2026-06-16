import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import type {
  CreateStateInput,
  UpdateStateInput,
} from '@simplekanban/shared';
import { ApiError } from '@simplekanban/shared';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

function invalidateStateConsumers(
  qc: QueryClient,
  teamId: string | undefined,
) {
  if (teamId) {
    qc.invalidateQueries({ queryKey: qk.teamStates(teamId) });
    qc.invalidateQueries({ queryKey: qk.issuesAll(teamId) });
  } else {
    qc.invalidateQueries({ queryKey: ['team'] });
    qc.invalidateQueries({ queryKey: ['issues'] });
  }
  qc.invalidateQueries({ queryKey: ['issue'] });
}

export function useCreateWorkflowState(teamId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStateInput) => api.teams.createState(teamId!, input),
    onSuccess: () => {
      invalidateStateConsumers(qc, teamId);
      toast.success('Status created');
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Failed to create status'),
  });
}

export function useUpdateWorkflowState(teamId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateStateInput }) =>
      api.states.update(id, input),
    onSuccess: () => {
      invalidateStateConsumers(qc, teamId);
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Failed to update status'),
  });
}

export function useDeleteWorkflowState(teamId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.states.delete(id),
    onSuccess: () => {
      invalidateStateConsumers(qc, teamId);
      toast.success('Status deleted');
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete status'),
  });
}
