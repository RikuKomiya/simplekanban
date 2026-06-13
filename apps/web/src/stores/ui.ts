import { create } from 'zustand';
import type { PriorityValue } from '@simplekanban/shared';

/** Prefill values for the new-issue modal. */
export interface NewIssuePrefill {
  teamId?: string;
  stateId?: string;
  priority?: PriorityValue;
  assigneeId?: string | null;
  projectId?: string | null;
  cycleId?: string | null;
}

interface UiStore {
  // Command palette
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;

  // New-issue modal
  newIssueOpen: boolean;
  newIssuePrefill: NewIssuePrefill;
  openNewIssue: (prefill?: NewIssuePrefill) => void;
  closeNewIssue: () => void;

  // Keyboard-shortcut help
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;

  // Sidebar collapse
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Issue peek panel (issue id, opened from board/list)
  peekIssueId: string | null;
  openPeek: (id: string) => void;
  closePeek: () => void;
}

const SIDEBAR_KEY = 'sk.sidebarCollapsed';

function readSidebar(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === '1';
  } catch {
    return false;
  }
}

export const useUiStore = create<UiStore>((set, get) => ({
  paletteOpen: false,
  setPaletteOpen: (open) => set({ paletteOpen: open }),

  newIssueOpen: false,
  newIssuePrefill: {},
  openNewIssue: (prefill = {}) =>
    set({ newIssueOpen: true, newIssuePrefill: prefill }),
  closeNewIssue: () => set({ newIssueOpen: false, newIssuePrefill: {} }),

  shortcutsOpen: false,
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),

  sidebarCollapsed: readSidebar(),
  toggleSidebar: () => {
    const next = !get().sidebarCollapsed;
    try {
      localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
    set({ sidebarCollapsed: next });
  },

  peekIssueId: null,
  openPeek: (id) => set({ peekIssueId: id }),
  closePeek: () => set({ peekIssueId: null }),
}));
