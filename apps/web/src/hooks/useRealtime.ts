import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  RealtimeEventSchema,
  type IssueWithRelations,
  type Notification,
} from '@simplekanban/shared';
import { CLIENT_ID } from '@/lib/clientId';

/**
 * Connects to `/api/v1/ws?workspace=<id>` and reconciles realtime events into
 * the TanStack Query cache. Auto-reconnects with exponential backoff. Events
 * whose `origin` is our own clientId are ignored (we already applied them
 * optimistically).
 */
export function useRealtime(workspaceId: string | undefined) {
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const closedRef = useRef(false);

  useEffect(() => {
    if (!workspaceId) return;
    closedRef.current = false;

    const connect = () => {
      if (closedRef.current) return;
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const url = `${proto}://${window.location.host}/api/v1/ws?workspace=${encodeURIComponent(workspaceId)}`;

      let socket: WebSocket;
      try {
        socket = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }
      wsRef.current = socket;

      socket.onopen = () => {
        retryRef.current = 0;
      };

      socket.onmessage = (ev) => {
        let json: unknown;
        try {
          json = JSON.parse(typeof ev.data === 'string' ? ev.data : '');
        } catch {
          return;
        }
        const parsed = RealtimeEventSchema.safeParse(json);
        if (!parsed.success) return;
        const { type, payload, origin } = parsed.data;
        // Suppress echo of our own mutations.
        if (origin && origin === CLIENT_ID) return;
        handleEvent(type, payload);
      };

      socket.onclose = () => {
        if (closedRef.current) return;
        scheduleReconnect();
      };

      socket.onerror = () => {
        // Let onclose drive reconnection.
        socket.close();
      };
    };

    const scheduleReconnect = () => {
      if (closedRef.current) return;
      const delay = Math.min(30_000, 1000 * 2 ** retryRef.current);
      retryRef.current += 1;
      window.setTimeout(connect, delay + Math.random() * 400);
    };

    const handleEvent = (type: string, payload: unknown) => {
      if (type.startsWith('issue.')) {
        const issue = payload as Partial<IssueWithRelations> & { id?: string };
        if (type === 'issue.deleted') {
          if (issue.id) qc.removeQueries({ queryKey: ['issue', issue.id] });
          qc.invalidateQueries({ queryKey: ['issues'] });
          return;
        }
        // created / updated — patch detail + lists, then invalidate to be safe.
        if (issue.id) {
          qc.invalidateQueries({ queryKey: ['issue', issue.id] });
        }
        qc.invalidateQueries({ queryKey: ['issues'] });
        return;
      }

      if (type.startsWith('comment.')) {
        const c = payload as { issueId?: string };
        if (c.issueId) qc.invalidateQueries({ queryKey: ['issue', c.issueId] });
        return;
      }

      if (type.startsWith('project.')) {
        qc.invalidateQueries({ queryKey: ['projects'] });
        const p = payload as { id?: string };
        if (p.id) qc.invalidateQueries({ queryKey: ['project', p.id] });
        return;
      }

      if (type.startsWith('cycle.')) {
        qc.invalidateQueries({ queryKey: ['team'] });
        return;
      }

      if (type.startsWith('label.')) {
        qc.invalidateQueries({ queryKey: ['workspace'] });
        return;
      }

      if (type.startsWith('state.')) {
        qc.invalidateQueries({ queryKey: ['team'] });
        qc.invalidateQueries({ queryKey: ['issues'] });
        return;
      }

      if (type === 'notification.created') {
        const notif = payload as Notification;
        qc.setQueriesData<Notification[]>(
          { queryKey: ['notifications'] },
          (prev) => {
            if (!Array.isArray(prev)) return prev;
            if (prev.some((n) => n.id === notif.id)) return prev;
            return [notif, ...prev];
          },
        );
        qc.invalidateQueries({ queryKey: ['notifications'] });
        return;
      }
    };

    connect();

    return () => {
      closedRef.current = true;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [workspaceId, qc]);
}
