import type { IssueActivityWithActor } from '@simplekanban/shared';
import { Avatar } from '@/components/ui/Avatar';
import { formatRelative } from '@/lib/format';

interface ActivityData {
  from?: unknown;
  to?: unknown;
  fromName?: string;
  toName?: string;
  name?: string;
}

function parseData(raw: string | null): ActivityData {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return typeof v === 'object' && v !== null ? (v as ActivityData) : {};
  } catch {
    return {};
  }
}

function describe(activity: IssueActivityWithActor): string {
  const d = parseData(activity.data);
  const fromTo = (from?: unknown, to?: unknown) => {
    const f = from != null ? String(from) : '';
    const t = to != null ? String(to) : '';
    if (f && t) return `${f} → ${t}`;
    if (t) return `to ${t}`;
    return '';
  };
  const detail = (val: string) => (val ? ` ${val}` : '');

  switch (activity.type) {
    case 'created':
      return 'created the issue';
    case 'state_changed':
      return `changed status${detail(fromTo(d.fromName ?? d.from, d.toName ?? d.to))}`;
    case 'assignee_changed':
      return d.toName || d.to
        ? `assigned to ${d.toName ?? d.to}`
        : 'unassigned the issue';
    case 'priority_changed':
      return `changed priority${detail(fromTo(d.fromName ?? d.from, d.toName ?? d.to))}`;
    case 'title_changed':
      return 'changed the title';
    case 'description_changed':
      return 'updated the description';
    case 'label_added':
      return `added label${detail(d.name ? String(d.name) : '')}`;
    case 'label_removed':
      return `removed label${detail(d.name ? String(d.name) : '')}`;
    case 'comment_added':
      return 'commented';
    case 'estimate_changed':
      return `set estimate${detail(fromTo(d.from, d.to))}`;
    case 'due_date_changed':
      return 'changed the due date';
    case 'project_changed':
      return `moved to project${detail(d.toName ? String(d.toName) : '')}`;
    case 'cycle_changed':
      return `changed cycle`;
    default:
      return activity.type.replace(/_/g, ' ');
  }
}

export function IssueActivityTimeline({
  activities,
}: {
  activities: IssueActivityWithActor[];
}) {
  if (activities.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
        Activity
      </h3>
      <div className="flex flex-col gap-2.5">
        {activities.map((a) => (
          <div key={a.id} className="flex items-center gap-2 text-xs">
            <Avatar
              id={a.actor.id}
              name={a.actor.name || a.actor.email}
              email={a.actor.email}
              image={a.actor.image}
              size={18}
            />
            <span className="text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text)]">
                {a.actor.name || a.actor.email}
              </span>{' '}
              {describe(a)}
            </span>
            <span className="text-[var(--text-tertiary)]">
              · {formatRelative(a.createdAt)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
