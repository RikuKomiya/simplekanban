import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from '@simplekanban/shared';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

export function useProjects(ws: string | undefined) {
  return useQuery({
    queryKey: qk.projects(ws ?? ''),
    queryFn: () => api.workspaces.projects(ws!),
    enabled: !!ws,
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: qk.project(id ?? ''),
    queryFn: () => api.projects.get(id!),
    enabled: !!id,
  });
}

export function useCreateProject(ws: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) =>
      api.workspaces.createProject(ws, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.projects(ws) });
      toast.success('Project created');
    },
    onError: () => toast.error('Failed to create project'),
  });
}

export function useUpdateProject(ws: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProjectInput }) =>
      api.projects.update(id, input),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: qk.projects(ws) });
      qc.invalidateQueries({ queryKey: qk.project(vars.id) });
    },
    onError: () => toast.error('Failed to update project'),
  });
}
