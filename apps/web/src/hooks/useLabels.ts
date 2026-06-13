import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CreateLabelInput,
  UpdateLabelInput,
} from '@simplekanban/shared';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

export function useCreateLabel(ws: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLabelInput) => api.workspaces.createLabel(ws, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.workspace(ws) });
      toast.success('Label created');
    },
    onError: () => toast.error('Failed to create label'),
  });
}

export function useUpdateLabel(ws: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateLabelInput }) =>
      api.labels.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.workspace(ws) });
    },
    onError: () => toast.error('Failed to update label'),
  });
}

export function useDeleteLabel(ws: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.labels.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.workspace(ws) });
      toast.success('Label deleted');
    },
    onError: () => toast.error('Failed to delete label'),
  });
}
