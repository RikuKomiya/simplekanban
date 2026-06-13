import { create } from 'zustand';

/**
 * Lightweight nav context that mirrors the current route's workspace/team so
 * global handlers (command palette, shortcuts) can act without prop-drilling.
 */
interface NavContext {
  ws: string | null;
  workspaceId: string | null;
  teamKey: string | null;
  teamId: string | null;
  set: (ctx: Partial<Omit<NavContext, 'set'>>) => void;
}

export const useNavContext = create<NavContext>((set) => ({
  ws: null,
  workspaceId: null,
  teamKey: null,
  teamId: null,
  set: (ctx) => set(ctx),
}));
