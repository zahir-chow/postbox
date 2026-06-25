import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';
import { HiOutlineMagnifyingGlass } from 'react-icons/hi2';
import Button from '../../components/ui/Button';
import { StatusBadge, PriorityBadge } from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import complaintService from '../../api/complaintService';
import { formatDate, STATUS_CONFIG } from '../../utils/helpers';
import './TrackComplaint.css';

export default function TrackComplaint() {
  const { t, language } = useLanguage();
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
      toast.error(
        language === 'en' ? 'Please enter a tracking token' : 'অনুগ্রহ করে একটি ট্র্যাকিং টোকেন প্রবেশ করান'
      );
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const data = await complaintService.trackComplaint(trackingToken.trim());
      setComplaint(data);
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error(
          language === 'en' ? 'No complaint found with this tracking token' : 'এই ট্র্যাকিং টোকেনের কোনো অভিযোগ পাওয়া যায়নি'
        );
      } else {
        toast.error(
          language === 'en' ? 'Failed to track complaint' : 'অভিযোগ ট্র্যাক করতে ব্যর্থ হয়েছে'
        );
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
            <h1>{t('track.titlePart1')}<span className="gradient-text">{t('track.titlePart2')}</span></h1>
            <p>{t('track.subtitle')}</p>
          </div>

          <div className="track-search glass-card animate-fade-in-up">
            <div className="track-input-group">
              <input
                id="tracking-token-input"
                type="text"
                placeholder={t('track.placeholderToken')}
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
                {t('track.btnTrack')}
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
                    <p className="track-date">{t('track.submitted')} {formatDate(complaint.created_at)}</p>
                  </div>
                  <div className="track-badges">
                    <StatusBadge status={complaint.status} />
                    <PriorityBadge priority={complaint.priority} />
                  </div>
                </div>

                {complaint.resolved_at && (
                  <div className="track-resolved">
                    ✅ {t('track.resolvedOn')} {formatDate(complaint.resolved_at)}
                  </div>
                )}

                <div className="track-meta">
                  <div className="track-meta-item">
                    <span className="track-meta-label">{t('track.attachments')}</span>
                    <span className="track-meta-value">{complaint.attachment_count || 0}</span>
                  </div>
                  <div className="track-meta-item">
                    <span className="track-meta-label">{t('track.nidStatus')}</span>
                    <span className="track-meta-value">
                      {complaint.nid_verification_status ? t(`status.${complaint.nid_verification_status}`) : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Timeline */}
              {complaint.status_logs && complaint.status_logs.length > 0 && (
                <div className="track-timeline glass-card">
                  <h3 className="track-timeline-title">{t('track.timeline')}</h3>
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
                                {t(`status.${log.new_status}`)}
                              </span>
                              <span className="timeline-date">{formatDate(log.created_at)}</span>
                            </div>
                            <p className="timeline-from">
                              {t('track.from')}: {t(`status.${log.old_status}`)}
                            </p>
                            {log.notes && <p className="timeline-notes">{log.notes}</p>}
                            <p className="timeline-by">{t('track.by')}: {log.changed_by_name}</p>
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
              <p>{t('track.empty')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
