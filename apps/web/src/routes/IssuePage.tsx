import { useParams } from '@tanstack/react-router';
import { useIssueByKey } from '@/hooks/useIssue';
import { IssueDetailView } from '@/components/issue/IssueDetailView';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';

export function IssuePage() {
  const { identifier } = useParams({ strict: false }) as { identifier: string };
  const { data: issue, isLoading, isError } = useIssueByKey(identifier);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (isError || !issue) {
    return (
      <EmptyState
        title="Issue not found"
        description={`We couldn't find ${identifier}.`}
      />
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <IssueDetailView issue={issue} layout="full" />
    </div>
  );
}
