import { useEffect } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

/** `/:ws` → redirect to the first team's board. */
export function WorkspaceIndexRoute() {
  const { ws } = useParams({ strict: false }) as { ws: string };
  const navigate = useNavigate();
  const { data: workspace, isLoading } = useWorkspace(ws);

  const firstTeam = workspace?.teams[0];

  useEffect(() => {
    if (firstTeam) {
      navigate({
        to: '/$ws/team/$teamKey/board',
        params: { ws, teamKey: firstTeam.key },
        replace: true,
      });
    }
  }, [firstTeam, navigate, ws]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (workspace && workspace.teams.length === 0) {
    return (
      <EmptyState
        title="No teams yet"
        description="Create a team to start tracking issues."
        action={
          <Button
            variant="primary"
            onClick={() =>
              navigate({ to: '/$ws/settings/teams', params: { ws } })
            }
          >
            Create a team
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <Spinner />
    </div>
  );
}
