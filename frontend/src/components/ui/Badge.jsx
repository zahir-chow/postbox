import { STATUS_CONFIG, PRIORITY_CONFIG } from '../../utils/helpers';
import './Badge.css';

export function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || { label: status, color: 'var(--text-secondary)', bg: 'var(--surface)' };
  return (
    <span
      className="badge status-badge"
      style={{ color: config.color, backgroundColor: config.bg }}
    >
      <span className="badge-dot" style={{ backgroundColor: config.color }} />
      {config.label}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const config = PRIORITY_CONFIG[priority] || { label: priority, color: 'var(--text-secondary)' };
  return (
    <span
      className="badge priority-badge"
      style={{ color: config.color, borderColor: config.color }}
    >
      {config.label}
    </span>
  );
}

export function CountBadge({ count }) {
  if (!count) return null;
  return <span className="count-badge">{count > 99 ? '99+' : count}</span>;
}
