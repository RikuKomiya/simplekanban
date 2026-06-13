import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

export function useApiKeys(ws: string | undefined) {
  return useQuery({
    queryKey: qk.apiKeys(ws ?? ''),
    queryFn: () => api.workspaces.apiKeys(ws!),
    enabled: !!ws,
  });
}

export function useCreateApiKey(ws: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.workspaces.createApiKey(ws, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.apiKeys(ws) });
    },
    onError: () => toast.error('Failed to create API key'),
  });
}

export function useDeleteApiKey(ws: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.apiKeys.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.apiKeys(ws) });
      toast.success('API key revoked');
    },
    onError: () => toast.error('Failed to revoke API key'),
  });
}
