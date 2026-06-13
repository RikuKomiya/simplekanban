import { create } from 'zustand';
import type { FavoriteEntityType } from '@simplekanban/shared';

/**
 * NOTE: the shared `createApiClient` does not expose favorite CRUD endpoints
 * (the architecture lists a `favorite` table + entity type, but no client
 * methods were provided). To still deliver the "star issues/projects in the
 * sidebar" UX, favorites are persisted locally per browser. This is a documented
 * simplification — see the final report. The shape (`entityType`/`entityId`)
 * mirrors the server contract so this can be swapped for an API later.
 */

export interface FavoriteEntry {
  entityType: FavoriteEntityType;
  entityId: string;
  /** Denormalized display data so the sidebar can render without extra fetches. */
  label: string;
  href: string;
}

const STORAGE_KEY = 'sk.favorites';

function read(): FavoriteEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FavoriteEntry[]) : [];
  } catch {
    return [];
  }
}

function write(entries: FavoriteEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* ignore */
  }
}

interface FavoritesStore {
  favorites: FavoriteEntry[];
  isFavorite: (type: FavoriteEntityType, id: string) => boolean;
  toggle: (entry: FavoriteEntry) => void;
}

export const useFavoritesStore = create<FavoritesStore>((set, get) => ({
  favorites: read(),
  isFavorite: (type, id) =>
    get().favorites.some((f) => f.entityType === type && f.entityId === id),
  toggle: (entry) => {
    const current = get().favorites;
    const exists = current.some(
      (f) => f.entityType === entry.entityType && f.entityId === entry.entityId,
    );
    const next = exists
      ? current.filter(
          (f) =>
            !(
              f.entityType === entry.entityType && f.entityId === entry.entityId
            ),
        )
      : [...current, entry];
    write(next);
    set({ favorites: next });
  },
}));
