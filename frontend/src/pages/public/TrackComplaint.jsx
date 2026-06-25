import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineMagnifyingGlass } from 'react-icons/hi2';
import Button from '../../components/ui/Button';
import { StatusBadge, PriorityBadge } from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import complaintService from '../../api/complaintService';
import { formatDate, STATUS_CONFIG } from '../../utils/helpers';
import './TrackComplaint.css';

export default function TrackComplaint() {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (searchParams.get('token')) {
      handleTrack(searchParams.get('token'));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTrack = async (trackingToken = token) => {
    if (!trackingToken.trim()) {
      toast.error('Please enter a tracking token');
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const data = await complaintService.trackComplaint(trackingToken.trim());
      setComplaint(data);
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error('No complaint found with this tracking token');
      } else {
        toast.error('Failed to track complaint');
      }
      setComplaint(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="track-page">
      <div className="container">
        <div className="track-wrapper">
          <div className="track-header animate-fade-in">
            <h1>Track Your <span className="gradient-text">Complaint</span></h1>
            <p>Enter your tracking token to see the current status of your complaint.</p>
          </div>

          <div className="track-search glass-card animate-fade-in-up">
            <div className="track-input-group">
              <input
                id="tracking-token-input"
                type="text"
                placeholder="Enter your tracking token (UUID)…"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
              />
              <Button
                variant="primary"
                loading={loading}
                onClick={() => handleTrack()}
                icon={<HiOutlineMagnifyingGlass size={18} />}
              >
                Track
              </Button>
            </div>
          </div>

          {/* Results */}
          {loading && <PageSpinner />}

          {!loading && complaint && (
            <div className="track-result animate-fade-in-up">
              {/* Status Overview */}
              <div className="track-status-card glass-card">
                <div className="track-status-header">
                  <div>
                    <h3 className="track-subject">{complaint.subject}</h3>
                    <p className="track-date">Submitted {formatDate(complaint.created_at)}</p>
                  </div>
                  <div className="track-badges">
                    <StatusBadge status={complaint.status} />
                    <PriorityBadge priority={complaint.priority} />
                  </div>
                </div>

                {complaint.resolved_at && (
                  <div className="track-resolved">
                    ✅ Resolved on {formatDate(complaint.resolved_at)}
                  </div>
                )}

                <div className="track-meta">
                  <div className="track-meta-item">
                    <span className="track-meta-label">Attachments</span>
                    <span className="track-meta-value">{complaint.attachment_count || 0}</span>
                  </div>
                  <div className="track-meta-item">
                    <span className="track-meta-label">NID Status</span>
                    <span className="track-meta-value">{complaint.nid_verification_status || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Status Timeline */}
              {complaint.status_logs && complaint.status_logs.length > 0 && (
                <div className="track-timeline glass-card">
                  <h3 className="track-timeline-title">Status Timeline</h3>
                  <div className="timeline">
                    {complaint.status_logs.map((log, i) => {
                      const config = STATUS_CONFIG[log.new_status] || {};
                      return (
                        <div key={log.id || i} className="timeline-item">
                          <div
                            className="timeline-dot"
                            style={{ backgroundColor: config.color || 'var(--text-tertiary)' }}
                          />
                          <div className="timeline-line" />
                          <div className="timeline-content">
                            <div className="timeline-header">
                              <span className="timeline-status" style={{ color: config.color }}>
                                {config.label || log.new_status}
                              </span>
                              <span className="timeline-date">{formatDate(log.created_at)}</span>
                            </div>
                            <p className="timeline-from">
                              From: {STATUS_CONFIG[log.old_status]?.label || log.old_status}
                            </p>
                            {log.notes && <p className="timeline-notes">{log.notes}</p>}
                            <p className="timeline-by">By: {log.changed_by_name}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {!loading && searched && !complaint && (
            <div className="track-empty glass-card animate-fade-in">
              <p>No complaint found. Please double-check your tracking token.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
