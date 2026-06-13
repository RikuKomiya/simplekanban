import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

export function useAddComment(issueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api.issues.addComment(issueId, { body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.issue(issueId) });
    },
    onError: () => toast.error('Failed to post comment'),
  });
}

export function useUpdateComment(issueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) =>
      api.comments.update(id, { body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.issue(issueId) });
    },
    onError: () => toast.error('Failed to update comment'),
  });
}

export function useDeleteComment(issueId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.comments.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.issue(issueId) });
    },
    onError: () => toast.error('Failed to delete comment'),
  });
}
