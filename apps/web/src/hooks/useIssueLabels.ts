import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { IssueDetail, IssueWithRelations, Label } from '@simplekanban/shared';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

/**
 * Toggle a label on an issue. Optimistically patches both the detail and all
 * list caches so the chip appears/disappears instantly.
 */
export function useToggleIssueLabel(issueId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      label,
      attached,
    }: {
      label: Label;
      attached: boolean;
    }) => {
      if (attached) {
        await api.issues.removeLabel(issueId, label.id);
      } else {
        await api.issues.addLabel(issueId, { labelId: label.id });
      }
    },
    onMutate: async ({ label, attached }) => {
      await qc.cancelQueries({ queryKey: qk.issue(issueId) });
      const prevDetail = qc.getQueryData<IssueDetail>(qk.issue(issueId));

      const apply = (labels: Label[]): Label[] =>
        attached
          ? labels.filter((l) => l.id !== label.id)
          : [...labels, label];

      if (prevDetail) {
        qc.setQueryData<IssueDetail>(qk.issue(issueId), {
          ...prevDetail,
          labels: apply(prevDetail.labels),
        });
      }

      const snapshots: [readonly unknown[], IssueWithRelations[]][] = [];
      qc.getQueriesData<IssueWithRelations[]>({ queryKey: ['issues'] }).forEach(
        ([key, list]) => {
          if (!Array.isArray(list)) return;
          if (!list.some((i) => i.id === issueId)) return;
          snapshots.push([key, list]);
          qc.setQueryData<IssueWithRelations[]>(
            key,
            list.map((i) =>
              i.id === issueId ? { ...i, labels: apply(i.labels) } : i,
            ),
          );
        },
      );

      return { prevDetail, snapshots };
    },
    onError: (_e, _v, ctx) => {
      if (!ctx) return;
      if (ctx.prevDetail) qc.setQueryData(qk.issue(issueId), ctx.prevDetail);
      ctx.snapshots.forEach(([key, list]) => qc.setQueryData(key, list));
      toast.error('Failed to update labels');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.issue(issueId) });
      qc.invalidateQueries({ queryKey: ['issues'] });
    },
  });
}
