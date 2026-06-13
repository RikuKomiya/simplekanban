import { useEffect, useRef } from 'react';

/** True when the event originates from an editable element. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  // Inside a radix/cmdk dialog input etc.
  if (target.closest('[contenteditable="true"]')) return true;
  return false;
}

export type KeyHandler = (e: KeyboardEvent) => void;

interface ShortcutMap {
  /** Single keys: 'c', '?', etc. Modifier combos: 'mod+k'. */
  [combo: string]: KeyHandler;
}

/** Chord prefixes (e.g. pressing `g` then `b`). */
interface ChordMap {
  [prefix: string]: { [next: string]: KeyHandler };
}

function comboFromEvent(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.metaKey || e.ctrlKey) parts.push('mod');
  if (e.shiftKey) parts.push('shift');
  if (e.altKey) parts.push('alt');
  const key = e.key.toLowerCase();
  parts.push(key);
  return parts.join('+');
}

/**
 * Global keyboard shortcuts. `single` fires for plain/modified keys.
 * `chords` fires a two-key sequence (prefix then next within 800ms).
 * Editable targets are skipped unless the combo includes a modifier.
 */
export function useKeyboardShortcuts(
  single: ShortcutMap,
  chords: ChordMap = {},
  enabled = true,
) {
  const chordPrefix = useRef<string | null>(null);
  const chordTimer = useRef<number | null>(null);

  // Keep latest handlers without re-binding the listener each render.
  const singleRef = useRef(single);
  const chordsRef = useRef(chords);
  singleRef.current = single;
  chordsRef.current = chords;

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const editable = isEditableTarget(e.target);
      const hasMod = e.metaKey || e.ctrlKey;

      // Resolve chord continuation first.
      if (chordPrefix.current && !editable && !hasMod) {
        const next = e.key.toLowerCase();
        const handler = chordsRef.current[chordPrefix.current]?.[next];
        clearChord();
        if (handler) {
          e.preventDefault();
          handler(e);
          return;
        }
      }

      const combo = comboFromEvent(e);

      // Modifier combos always fire (even inside inputs, e.g. cmd+k).
      const handler = singleRef.current[combo];
      if (handler) {
        if (editable && !hasMod) return;
        e.preventDefault();
        handler(e);
        return;
      }

      // Begin a chord if this plain key is a registered prefix.
      if (!editable && !hasMod && chordsRef.current[e.key.toLowerCase()]) {
        startChord(e.key.toLowerCase());
      }
    };

    const startChord = (prefix: string) => {
      chordPrefix.current = prefix;
      if (chordTimer.current) window.clearTimeout(chordTimer.current);
      chordTimer.current = window.setTimeout(clearChord, 800);
    };
    const clearChord = () => {
      chordPrefix.current = null;
      if (chordTimer.current) {
        window.clearTimeout(chordTimer.current);
        chordTimer.current = null;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (chordTimer.current) window.clearTimeout(chordTimer.current);
    };
  }, [enabled]);
}
