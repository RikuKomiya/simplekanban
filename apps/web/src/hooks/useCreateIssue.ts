import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateIssueInput, IssueDetail } from '@simplekanban/shared';
import { formatIdentifier } from '@simplekanban/shared';
import { toast } from 'sonner';
import { api } from '@/lib/api';

interface CreateArgs {
  teamId: string;
  teamKey: string;
  ws: string;
  input: CreateIssueInput;
  /** Optional navigate-to-issue callback for the toast action. */
  onOpen?: (identifier: string) => void;
}

/**
 * POST /teams/:teamId/issues. On success shows a toast with the new identifier
 * (clickable to open the issue) and refreshes list caches.
 */
export function useCreateIssue() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, input }: CreateArgs) =>
      api.issues.create(teamId, input),
    onSuccess: (issue: IssueDetail, vars) => {
      qc.invalidateQueries({ queryKey: ['issues'] });
      qc.setQueryData(['issue', issue.id], issue);
      const identifier = formatIdentifier(vars.teamKey, issue.number);
      toast.success(`Created ${identifier}`, {
        action: vars.onOpen
          ? {
              label: 'Open',
              onClick: () => vars.onOpen?.(identifier),
            }
          : undefined,
      });
    },
    onError: () => toast.error('Failed to create issue'),
  });
}
