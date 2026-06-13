import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  IssueDetail,
  IssueWithRelations,
  UpdateIssueInput,
} from '@simplekanban/shared';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

/** GET /issues/:id — full detail. */
export function useIssueDetail(id: string | undefined) {
  return useQuery({
    queryKey: qk.issue(id ?? ''),
    queryFn: () => api.issues.get(id!),
    enabled: !!id,
  });
}

/** GET /issues/by-key/:identifier (e.g. "ENG-42"). */
export function useIssueByKey(identifier: string | undefined) {
  return useQuery({
    queryKey: qk.issueByKey(identifier ?? ''),
    queryFn: () => api.issues.getByKey(identifier!),
    enabled: !!identifier,
  });
}

/**
 * PATCH /issues/:id with optimistic update + rollback. Patches both the detail
 * cache and any list caches that contain the issue.
 */
export function useUpdateIssue() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateIssueInput }) =>
      api.issues.update(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: qk.issue(id) });

      const prevDetail = qc.getQueryData<IssueDetail>(qk.issue(id));

      // Patch detail cache.
      if (prevDetail) {
        qc.setQueryData<IssueDetail>(qk.issue(id), {
          ...prevDetail,
          ...patch,
        } as IssueDetail);
      }

      // Patch every issue-list cache that contains this issue.
      const listSnapshots: [readonly unknown[], IssueWithRelations[]][] = [];
      qc.getQueriesData<IssueWithRelations[]>({ queryKey: ['issues'] }).forEach(
        ([key, list]) => {
          if (!Array.isArray(list)) return;
          if (!list.some((i) => i.id === id)) return;
          listSnapshots.push([key, list]);
          qc.setQueryData<IssueWithRelations[]>(
            key,
            list.map((i) => (i.id === id ? ({ ...i, ...patch } as IssueWithRelations) : i)),
          );
        },
      );

      return { prevDetail, listSnapshots, id };
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      if (ctx.prevDetail) qc.setQueryData(qk.issue(ctx.id), ctx.prevDetail);
      ctx.listSnapshots.forEach(([key, list]) => qc.setQueryData(key, list));
      toast.error('Failed to update issue');
    },
    onSettled: (_data, _err, vars) => {
      qc.invalidateQueries({ queryKey: qk.issue(vars.id) });
      qc.invalidateQueries({ queryKey: ['issues'] });
    },
  });
}

/** DELETE /issues/:id. */
export function useDeleteIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.issues.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['issues'] });
      toast.success('Issue deleted');
    },
    onError: () => toast.error('Failed to delete issue'),
  });
}
