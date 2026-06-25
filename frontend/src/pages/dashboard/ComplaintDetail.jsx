import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';
import {
  HiOutlineArrowLeft,
  HiOutlinePaperClip,
  HiOutlineClipboardDocument,
  HiOutlineIdentification,
} from 'react-icons/hi2';
import complaintService from '../../api/complaintService';
import { StatusBadge, PriorityBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';
import { useAuth } from '../../context/AuthContext';
import {
  formatDate,
  formatFileSize,
  copyToClipboard,
  STATUS_CONFIG,
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
} from '../../utils/helpers';
import './ComplaintDetail.css';

export default function ComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { t, language } = useLanguage();
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Admin action form
  const [newStatus, setNewStatus] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [notes, setNotes] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    loadComplaint();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadComplaint = async () => {
    setLoading(true);
    try {
      const data = await complaintService.getComplaintDetail(id);
      setComplaint(data);
      setNewStatus(data.status);
      setNewPriority(data.priority);
      setAdminNotes(data.admin_notes || '');
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error(
          language === 'en' ? 'Complaint not found' : 'অভিযোগটি পাওয়া যায়নি'
        );
        navigate('/dashboard/complaints');
      } else {
        toast.error(
          language === 'en' ? 'Failed to load complaint' : 'অভিযোগ লোড করতে ব্যর্থ হয়েছে'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (newStatus === complaint.status && newPriority === complaint.priority && !notes.trim()) {
      toast.error(
        language === 'en' ? 'No changes to save' : 'সংরক্ষণের জন্য কোনো পরিবর্তন করা হয়নি'
      );
      return;
    }

    setUpdating(true);
    try {
      await complaintService.updateComplaintStatus(id, {
        status: newStatus,
        notes: notes.trim(),
        priority: newPriority !== complaint.priority ? newPriority : undefined,
        admin_notes: adminNotes,
      });
      toast.success(
        language === 'en' ? 'Complaint updated!' : 'অভিযোগ আপডেট করা হয়েছে!'
      );
      setNotes('');
      await loadComplaint();
    } catch {
      toast.error(
        language === 'en' ? 'Failed to update complaint' : 'অভিযোগ আপডেট করতে ব্যর্থ হয়েছে'
      );
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <PageSpinner />;
  if (!complaint) return null;

  return (
    <div className="cd-page">
      {/* Header */}
      <div className="cd-header animate-fade-in">
        <button className="cd-back" onClick={() => navigate('/dashboard/complaints')}>
          <HiOutlineArrowLeft size={20} />
          {t('cd.back')}
        </button>
        <div className="cd-header-main">
          <div className="cd-header-left">
            <h1 className="cd-title">{complaint.subject}</h1>
            <div className="cd-header-meta">
              <StatusBadge status={complaint.status} />
              <PriorityBadge priority={complaint.priority} />
              <span className="cd-date">{t('track.submitted')} {formatDate(complaint.created_at)}</span>
            </div>
          </div>
          <div className="cd-tracking">
            <span className="cd-tracking-label">{t('cd.trackingToken')}</span>
            <button
              className="cd-tracking-token"
              onClick={() => {
                copyToClipboard(complaint.tracking_token);
                toast.success(t('common.copied'));
              }}
              title="Click to copy"
            >
              <code>{complaint.tracking_token}</code>
              <HiOutlineClipboardDocument size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="cd-grid">
        {/* Main Content */}
        <div className="cd-main">
          {/* Complaint Body */}
          <div className="cd-section glass-card animate-fade-in-up stagger-1">
            <h3 className="cd-section-title">{t('cd.title')}</h3>
            <div className="cd-info-row">
              <span className="cd-info-label">{t('submit.labelUP')}</span>
              <span className="cd-info-value">{complaint.union_parishad?.name || '—'}</span>
            </div>
            <div className="cd-info-row">
              <span className="cd-info-label">{t('cd.complainant')}</span>
              <span className="cd-info-value">
                {complaint.is_anonymous ? t('submit.identityAnonTitle') : (complaint.complainant_name || complaint.complainant?.display_name || complaint.complainant?.username)}
              </span>
            </div>
            <div className="cd-body-content">
              <p>{complaint.body}</p>
            </div>
          </div>

          {/* Attachments */}
          {complaint.attachments && complaint.attachments.length > 0 && (
            <div className="cd-section glass-card animate-fade-in-up stagger-2">
              <h3 className="cd-section-title">
                <HiOutlinePaperClip size={18} />
                {t('submit.reviewAttachments')} ({complaint.attachments.length})
              </h3>
              <div className="cd-attachments">
                {complaint.attachments.map((att) => (
                  <a
                    key={att.id}
                    href={att.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cd-attachment-item"
                  >
                    {att.file_type?.startsWith('image/') ? (
                      <div className="cd-att-preview">
                        <img src={att.file_url} alt={att.file_name} />
                      </div>
                    ) : (
                      <div className="cd-att-icon">📄</div>
                    )}
                    <div className="cd-att-info">
                      <span className="cd-att-name">{att.file_name}</span>
                      <span className="cd-att-size">{formatFileSize(att.file_size)}</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* NID Verification */}
          {complaint.nid_task && (
            <div className="cd-section glass-card animate-fade-in-up stagger-3">
              <h3 className="cd-section-title">
                <HiOutlineIdentification size={18} />
                {t('cd.nidVerification')}
              </h3>
              <div className="cd-nid-info">
                <div className="cd-info-row">
                  <span className="cd-info-label">{t('cl.status')}</span>
                  <StatusBadge status={complaint.nid_task.status} />
                </div>
                {complaint.nid_task.extracted_name && (
                  <div className="cd-info-row">
                    <span className="cd-info-label">{t('cd.extractedName')}</span>
                    <span className="cd-info-value">{complaint.nid_task.extracted_name}</span>
                  </div>
                )}
                {complaint.nid_task.jurisdiction_match !== null && (
                  <div className="cd-info-row">
                    <span className="cd-info-label">{t('cd.jurisdictionMatch')}</span>
                    <span className="cd-info-value">
                      {complaint.nid_task.jurisdiction_match ? `✅ ${t('cd.yes')}` : `❌ ${t('cd.no')}`}
                    </span>
                  </div>
                )}
                {complaint.nid_task.error_message && (
                  <div className="cd-info-row">
                    <span className="cd-info-label">{t('cd.error')}</span>
                    <span className="cd-info-value cd-error-text">{complaint.nid_task.error_message}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status Timeline */}
          {complaint.status_logs && complaint.status_logs.length > 0 && (
            <div className="cd-section glass-card animate-fade-in-up stagger-4">
              <h3 className="cd-section-title">{t('cd.statusLogs')}</h3>
              <div className="timeline">
                {complaint.status_logs.map((log, i) => {
                  const config = STATUS_CONFIG[log.new_status] || {};
                  return (
                    <div key={log.id || i} className="timeline-item">
                      <div
                        className="timeline-dot"
                        style={{ backgroundColor: config.color || 'var(--text-tertiary)' }}
                      />
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <span className="timeline-status" style={{ color: config.color }}>
                            {t(`status.${log.new_status}`) || log.new_status}
                          </span>
                          <span className="timeline-date">{formatDate(log.created_at)}</span>
                        </div>
                        <p className="timeline-from">
                          {t('track.from')}: {t(`status.${log.old_status}`) || log.old_status}
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

        {/* Admin Action Panel */}
        {isAdmin && (
          <div className="cd-sidebar animate-slide-in-right">
            <div className="cd-action-panel glass-card">
              <h3 className="cd-section-title">{t('cd.adminActions')}</h3>

              <div className="form-group">
                <label className="form-label" htmlFor="cd-status">{t('cd.updateStatus')}</label>
                <select
                  id="cd-status"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {t(`status.${opt.value}`) || opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="cd-priority">{t('cl.priority')}</label>
                <select
                  id="cd-priority"
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                >
                  {PRIORITY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {t(`priority.${opt.value}`) || opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="cd-notes">{t('cd.statusChangeNotes')}</label>
                <textarea
                  id="cd-notes"
                  placeholder={t('cd.statusPlaceholder')}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="cd-admin-notes">{t('cd.internalNotes')}</label>
                <textarea
                  id="cd-admin-notes"
                  placeholder={t('cd.internalPlaceholder')}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <Button
                variant="primary"
                fullWidth
                loading={updating}
                onClick={handleStatusUpdate}
              >
                {t('common.saveChanges')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
