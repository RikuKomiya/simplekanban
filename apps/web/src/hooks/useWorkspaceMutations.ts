import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  CreateTeamInput,
  CreateWorkspaceInput,
  InviteMemberInput,
} from '@simplekanban/shared';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

export function useCreateWorkspace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWorkspaceInput) => api.workspaces.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.me() });
    },
  });
}

export function useCreateTeam(ws: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTeamInput) => api.workspaces.createTeam(ws, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.workspace(ws) });
    },
  });
}

export function useInviteMember(ws: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteMemberInput) =>
      api.workspaces.inviteMember(ws, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.workspace(ws) });
      toast.success('Member invited');
    },
    onError: () => toast.error('Failed to invite member (must be an existing user)'),
  });
}
