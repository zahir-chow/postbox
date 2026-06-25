// Status display config
export const STATUS_CONFIG = {
  UNREAD: { label: 'Unread', color: 'var(--status-unread)', bg: 'var(--status-unread-bg)' },
  UNDER_REVIEW: { label: 'Under Review', color: 'var(--status-review)', bg: 'var(--status-review-bg)' },
  IN_PROGRESS: { label: 'In Progress', color: 'var(--status-progress)', bg: 'var(--status-progress-bg)' },
  ESCALATED: { label: 'Escalated', color: 'var(--status-escalated)', bg: 'var(--status-escalated-bg)' },
  RESOLVED: { label: 'Resolved', color: 'var(--status-resolved)', bg: 'var(--status-resolved-bg)' },
  REJECTED: { label: 'Rejected', color: 'var(--status-rejected)', bg: 'var(--status-rejected-bg)' },
};

export const PRIORITY_CONFIG = {
  LOW: { label: 'Low', color: 'var(--priority-low)' },
  MEDIUM: { label: 'Medium', color: 'var(--priority-medium)' },
  HIGH: { label: 'High', color: 'var(--priority-high)' },
  URGENT: { label: 'Urgent', color: 'var(--priority-urgent)' },
};

export const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([value, config]) => ({
  value,
  label: config.label,
}));

export const PRIORITY_OPTIONS = Object.entries(PRIORITY_CONFIG).map(([value, config]) => ({
  value,
  label: config.label,
}));

/**
 * Format a date string to a readable format
 */
export function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(dateString);
}

/**
 * Format file size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Truncate text
 */
export function truncate(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '…';
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return true;
  }
}
