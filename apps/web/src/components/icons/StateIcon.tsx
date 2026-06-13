import type { StateType } from '@simplekanban/shared';

interface Props {
  type: StateType;
  color: string;
  size?: number;
  className?: string;
}

/**
 * Linear-style workflow-state glyphs, hand-drawn as SVG. The accent color is
 * the workflowState.color.
 * - backlog: dashed circle
 * - unstarted: empty circle (thin ring)
 * - started: ring with a partial pie fill (progress)
 * - completed: filled circle with a check
 * - canceled: filled circle with an ×
 */
export function StateIcon({ type, color, size = 16, className }: Props) {
  const c = color || 'var(--text-secondary)';

  if (type === 'completed') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        className={className}
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="7" fill={c} />
        <path
          d="M4.7 8.1l2 2 4-4.2"
          fill="none"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === 'canceled') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        className={className}
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="7" fill={c} />
        <path
          d="M5.5 5.5l5 5M10.5 5.5l-5 5"
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === 'backlog') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        className={className}
        aria-hidden="true"
      >
        <circle
          cx="8"
          cy="8"
          r="6.2"
          fill="none"
          stroke={c}
          strokeWidth="1.5"
          strokeDasharray="2.2 2.2"
        />
      </svg>
    );
  }

  if (type === 'started') {
    // Ring + ~55% pie fill to convey in-progress.
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        className={className}
        aria-hidden="true"
      >
        <circle
          cx="8"
          cy="8"
          r="6.2"
          fill="none"
          stroke={c}
          strokeWidth="1.5"
        />
        <path d="M8 8 L8 3.3 A4.7 4.7 0 0 1 11.8 9.8 Z" fill={c} />
        <circle
          cx="8"
          cy="8"
          r="3.4"
          fill="none"
          stroke={c}
          strokeWidth="3.4"
          strokeDasharray="6.5 21.4"
          transform="rotate(-90 8 8)"
        />
      </svg>
    );
  }

  // unstarted — thin empty ring.
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.2" fill="none" stroke={c} strokeWidth="1.5" />
    </svg>
  );
}
