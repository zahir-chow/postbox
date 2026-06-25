import { useState, useEffect } from 'react';
import { HiOutlineDocumentText, HiOutlineEye, HiOutlineClock, HiOutlineCheckCircle } from 'react-icons/hi2';
import { useLanguage } from '../../context/LanguageContext';
import complaintService from '../../api/complaintService';
import { PageSpinner } from '../../components/ui/Spinner';
import './Dashboard.css';

export default function Dashboard() {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await complaintService.getAdminStats();
      setStats(data);
    } catch {
      // Stats might fail if no data yet
      setStats({
        total: 0, unread: 0, in_progress: 0, resolved: 0,
        by_status: {}, by_priority: {}, by_source: { anonymous: 0, verified: 0 },
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <PageSpinner />;

  const statCards = [
    { label: t('dashboard.totalComplaints'), value: stats.total, icon: <HiOutlineDocumentText size={24} />, color: 'var(--accent-primary)' },
    { label: t('dashboard.unread'), value: stats.unread, icon: <HiOutlineEye size={24} />, color: 'var(--status-unread)' },
    { label: t('dashboard.inProgress'), value: stats.in_progress, icon: <HiOutlineClock size={24} />, color: 'var(--status-progress)' },
    { label: t('dashboard.resolved'), value: stats.resolved, icon: <HiOutlineCheckCircle size={24} />, color: 'var(--status-resolved)' },
  ];

  const statusEntries = Object.entries(stats.by_status || {});
  const maxStatusCount = Math.max(...statusEntries.map(([, v]) => v), 1);

  const priorityEntries = Object.entries(stats.by_priority || {});
  const maxPriorityCount = Math.max(...priorityEntries.map(([, v]) => v), 1);

  const statusColors = {
    UNREAD: 'var(--status-unread)',
    UNDER_REVIEW: 'var(--status-review)',
    IN_PROGRESS: 'var(--status-progress)',
    ESCALATED: 'var(--status-escalated)',
    RESOLVED: 'var(--status-resolved)',
    REJECTED: 'var(--status-rejected)',
  };

  const priorityColors = {
    LOW: 'var(--priority-low)',
    MEDIUM: 'var(--priority-medium)',
    HIGH: 'var(--priority-high)',
    URGENT: 'var(--priority-urgent)',
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header animate-fade-in">
        <h1>{t('dashboard.title')}</h1>
        <p className="dashboard-subtitle">{t('dashboard.subtitle')}</p>
      </div>

      {/* Stat Cards */}
      <div className="stat-cards">
        {statCards.map((card, i) => (
          <div
            key={card.label}
            className={`stat-card glass-card animate-fade-in-up stagger-${i + 1}`}
          >
            <div className="stat-card-icon" style={{ color: card.color, backgroundColor: card.color + '1a' }}>
              {card.icon}
            </div>
            <div className="stat-card-info">
              <span className="stat-card-value animate-fade-in">{card.value}</span>
              <span className="stat-card-label">{card.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        {/* Status Distribution */}
        <div className="dashboard-chart glass-card animate-fade-in-up stagger-2">
          <h3 className="chart-title">{t('dashboard.byStatus')}</h3>
          <div className="bar-chart">
            {statusEntries.map(([status, count]) => (
              <div key={status} className="bar-row">
                <span className="bar-label">{t(`status.${status}`) || status}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${(count / maxStatusCount) * 100}%`,
                      backgroundColor: statusColors[status] || 'var(--accent-primary)',
                    }}
                  />
                </div>
                <span className="bar-value">{count}</span>
              </div>
            ))}
            {statusEntries.length === 0 && (
              <p className="chart-empty">{t('dashboard.noData')}</p>
            )}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="dashboard-chart glass-card animate-fade-in-up stagger-3">
          <h3 className="chart-title">{t('dashboard.byPriority')}</h3>
          <div className="bar-chart">
            {priorityEntries.map(([priority, count]) => (
              <div key={priority} className="bar-row">
                <span className="bar-label">{t(`priority.${priority}`) || priority}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${(count / maxPriorityCount) * 100}%`,
                      backgroundColor: priorityColors[priority] || 'var(--accent-primary)',
                    }}
                  />
                </div>
                <span className="bar-value">{count}</span>
              </div>
            ))}
            {priorityEntries.length === 0 && (
              <p className="chart-empty">{t('dashboard.noData')}</p>
            )}
          </div>
        </div>

        {/* Source Distribution */}
        <div className="dashboard-chart glass-card animate-fade-in-up stagger-4">
          <h3 className="chart-title">{t('dashboard.submissionSource')}</h3>
          <div className="source-stats">
            <div className="source-item">
              <div className="source-ring">
                <svg viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="var(--surface-border)"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="var(--accent-secondary)"
                    strokeWidth="3"
                    strokeDasharray={`${stats.total ? (stats.by_source.anonymous / stats.total) * 100 : 0}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="source-ring-value">{stats.by_source.anonymous}</span>
              </div>
              <span className="source-label">{t('dashboard.anonymous')}</span>
            </div>
            <div className="source-item">
              <div className="source-ring">
                <svg viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="var(--surface-border)"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="var(--accent-primary)"
                    strokeWidth="3"
                    strokeDasharray={`${stats.total ? (stats.by_source.verified / stats.total) * 100 : 0}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="source-ring-value">{stats.by_source.verified}</span>
              </div>
              <span className="source-label">{t('dashboard.verified')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
