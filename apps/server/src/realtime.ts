import type { RealtimeEvent } from '@simplekanban/shared';

/**
 * Abstraction over realtime fan-out. Dev uses in-memory rooms; prod publishes
 * into a per-workspace Durable Object that broadcasts to WebSocket clients.
 */
export interface RealtimePublisher {
  /** Publish an event to every client connected to `workspaceId`'s room. */
  publish(workspaceId: string, event: RealtimeEvent): Promise<void>;
}

/** No-op publisher (used when realtime isn't wired, e.g. some tests). */
export const noopPublisher: RealtimePublisher = {
  async publish() {
    /* no-op */
  },
};

/**
 * In-memory rooms keyed by workspace id. Used by the dev (Bun) server where the
 * process holds all WebSocket connections directly.
 */
export class InMemoryRealtime implements RealtimePublisher {
  private readonly rooms = new Map<string, Set<WebSocket>>();

  add(workspaceId: string, ws: WebSocket): void {
    let room = this.rooms.get(workspaceId);
    if (!room) {
      room = new Set();
      this.rooms.set(workspaceId, room);
    }
    room.add(ws);
  }

  remove(workspaceId: string, ws: WebSocket): void {
    const room = this.rooms.get(workspaceId);
    if (!room) return;
    room.delete(ws);
    if (room.size === 0) {
      this.rooms.delete(workspaceId);
    }
  }

  async publish(workspaceId: string, event: RealtimeEvent): Promise<void> {
    const room = this.rooms.get(workspaceId);
    if (!room) return;
    const data = JSON.stringify(event);
    for (const ws of room) {
      try {
        ws.send(data);
      } catch {
        // Drop broken sockets silently; they'll be cleaned up on close.
        room.delete(ws);
      }
    }
  }
}
