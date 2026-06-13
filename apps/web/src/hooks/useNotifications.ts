import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Notification } from '@simplekanban/shared';
import { api } from '@/lib/api';
import { qk } from '@/lib/queryKeys';

export function useNotifications(unread?: boolean) {
  return useQuery({
    queryKey: qk.notifications(unread),
    queryFn: () => api.notifications.list(unread),
    staleTime: 15_000,
  });
}

export function useUnreadCount() {
  const { data } = useNotifications();
  return (data ?? []).filter((n) => !n.readAt).length;
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.notifications.markRead(id),
    onMutate: async (id) => {
      const snapshots = qc.getQueriesData<Notification[]>({
        queryKey: ['notifications'],
      });
      snapshots.forEach(([key, list]) => {
        if (!Array.isArray(list)) return;
        qc.setQueryData<Notification[]>(
          key,
          list.map((n) =>
            n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
          ),
        );
      });
      return { snapshots };
    },
    onError: (_e, _v, ctx) => {
      ctx?.snapshots.forEach(([key, list]) => qc.setQueryData(key, list));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.notifications.markAllRead(),
    onMutate: async () => {
      const now = new Date().toISOString();
      const snapshots = qc.getQueriesData<Notification[]>({
        queryKey: ['notifications'],
      });
      snapshots.forEach(([key, list]) => {
        if (!Array.isArray(list)) return;
        qc.setQueryData<Notification[]>(
          key,
          list.map((n) => (n.readAt ? n : { ...n, readAt: now })),
        );
      });
      return { snapshots };
    },
    onError: (_e, _v, ctx) => {
      ctx?.snapshots.forEach(([key, list]) => qc.setQueryData(key, list));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
