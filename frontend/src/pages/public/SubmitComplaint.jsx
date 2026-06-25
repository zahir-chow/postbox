import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';
import { HiOutlineCloudArrowUp, HiOutlineXMark, HiOutlineClipboardDocument, HiOutlineCheckCircle, HiOutlineArrowLeft, HiOutlineArrowRight } from 'react-icons/hi2';
import Button from '../../components/ui/Button';
import complaintService from '../../api/complaintService';
import { formatFileSize, copyToClipboard } from '../../utils/helpers';
import './SubmitComplaint.css';

export default function SubmitComplaint() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [unionParishads, setUnionParishads] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [trackingToken, setTrackingToken] = useState('');
  const fileInputRef = useRef(null);

  const steps = [
    t('submit.stepDetails'),
    t('submit.stepIdentity'),
    t('submit.stepAttachments'),
    t('submit.stepReview')
  ];

  const [form, setForm] = useState({
    union_parishad: '',
    subject: '',
    body: '',
    is_anonymous: true,
    nid_image_url: '',
    nid_image_object_key: '',
    attachments: [],
  });

  const [uploadingFiles, setUploadingFiles] = useState([]);

  useEffect(() => {
    loadUnionParishads();
  }, []);

  const loadUnionParishads = async () => {
    try {
      const data = await complaintService.getUnionParishads();
      setUnionParishads(data.results || data || []);
    } catch {
      // Fallback if endpoint not available
      setUnionParishads([]);
    }
  };

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (files) => {
    for (const file of files) {
      if (form.attachments.length + uploadingFiles.length >= 5) {
        toast.error(t('submit.maxAttachments'));
        return;
      }

      const uploadId = Date.now() + '-' + file.name;
      setUploadingFiles((prev) => [...prev, { id: uploadId, name: file.name, progress: 0 }]);

      try {
        const presigned = await complaintService.getPresignedUrl({
          fileName: file.name,
          contentType: file.type,
          folder: 'attachments',
        });

        await complaintService.uploadToS3(
          presigned.upload_url,
          file,
          file.type,
          (progress) => {
            setUploadingFiles((prev) =>
              prev.map((f) => (f.id === uploadId ? { ...f, progress } : f))
            );
          }
        );

        const attachment = {
          file_url: presigned.upload_url.split('?')[0],
          object_key: presigned.object_key,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
        };

        setForm((prev) => ({
          ...prev,
          attachments: [...prev.attachments, attachment],
        }));

        setUploadingFiles((prev) => prev.filter((f) => f.id !== uploadId));
        toast.success(
          language === 'en' 
            ? `${file.name} uploaded` 
            : `${file.name} আপলোড সম্পন্ন`
        );
      } catch {
        setUploadingFiles((prev) => prev.filter((f) => f.id !== uploadId));
        toast.error(
          language === 'en' 
            ? `Failed to upload ${file.name}` 
            : `${file.name} আপলোড ব্যর্থ হয়েছে`
        );
      }
    }
  };

  const handleNIDUpload = async (file) => {
    try {
      const presigned = await complaintService.getPresignedUrl({
        fileName: file.name,
        contentType: file.type,
        folder: 'nid-photos',
      });

      await complaintService.uploadToS3(presigned.upload_url, file, file.type);

      updateForm('nid_image_url', presigned.upload_url.split('?')[0]);
      updateForm('nid_image_object_key', presigned.object_key);
      toast.success(
        language === 'en' ? 'NID image uploaded' : 'এনআইডি ছবি আপলোড সম্পন্ন'
      );
    } catch {
      toast.error(
        language === 'en' ? 'Failed to upload NID image' : 'এনআইডি ছবি আপলোড ব্যর্থ হয়েছে'
      );
    }
  };

  const removeAttachment = (index) => {
    setForm((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        union_parishad: form.union_parishad,
        subject: form.subject,
        body: form.body,
        is_anonymous: form.is_anonymous,
        attachments: form.attachments,
      };

      if (!form.is_anonymous) {
        payload.nid_image_url = form.nid_image_url;
        payload.nid_image_object_key = form.nid_image_object_key;
      }

      const result = await complaintService.submitComplaint(payload);
      setTrackingToken(result.tracking_token);
      setSubmitted(true);
      toast.success(
        language === 'en' ? 'Complaint submitted successfully!' : 'অভিযোগটি সফলভাবে দাখিল করা হয়েছে!'
      );
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data;
      if (typeof detail === 'string') {
        toast.error(detail);
      } else if (typeof detail === 'object') {
        const firstError = Object.values(detail)[0];
        toast.error(Array.isArray(firstError) ? firstError[0] : String(firstError));
      } else {
        toast.error(
          language === 'en' ? 'Failed to submit complaint' : 'অভিযোগ দাখিল করতে ব্যর্থ হয়েছে'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return form.union_parishad && form.subject.trim() && form.body.trim();
      case 1:
        return form.is_anonymous || (form.nid_image_url);
      case 2:
        return true;
      case 3:
        return true;
      default:
        return false;
    }
  };

  // Success screen
  if (submitted) {
    return (
      <div className="submit-page">
        <div className="container">
          <div className="submit-success glass-card animate-scale-in">
            <div className="success-icon">
              <HiOutlineCheckCircle size={64} />
            </div>
            <h2>{t('submit.successTitle')}</h2>
            <p className="success-message">
              {t('submit.successMessage')}
            </p>
            <div className="tracking-token-display">
              <code className="tracking-token-value">{trackingToken}</code>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  copyToClipboard(trackingToken);
                  toast.success(t('common.copied'));
                }}
              >
                <HiOutlineClipboardDocument size={18} />
                {t('common.copy')}
              </button>
            </div>
            <div className="success-actions">
              <Button variant="primary" onClick={() => navigate(`/track?token=${trackingToken}`)}>
                {t('submit.successTrack')}
              </Button>
              <Button variant="ghost" onClick={() => navigate('/')}>
                {t('submit.successHome')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="submit-page">
      <div className="container">
        <div className="submit-wrapper">
          <div className="submit-header animate-fade-in">
            <h1>{t('submit.titlePart1')}<span className="gradient-text">{t('submit.titlePart2')}</span></h1>
            <p>{t('submit.subtitle')}</p>
          </div>

          {/* Step Indicator */}
          <div className="step-indicator animate-fade-in">
            {steps.map((label, i) => (
              <div
                key={label}
                className={`step-dot ${i === step ? 'step-active' : ''} ${i < step ? 'step-done' : ''}`}
                onClick={() => i < step && setStep(i)}
              >
                <div className="step-dot-circle">{i < step ? '✓' : i + 1}</div>
                <span className="step-dot-label">{label}</span>
              </div>
            ))}
            <div className="step-line" style={{ '--progress': `${(step / (steps.length - 1)) * 100}%` }} />
          </div>

          {/* Form Steps */}
          <div className="submit-form glass-card animate-fade-in-up">
            {/* Step 1: Details */}
            {step === 0 && (
              <div className="form-step">
                <div className="form-group">
                  <label className="form-label" htmlFor="union_parishad">{t('submit.labelUP')}</label>
                  <select
                    id="union_parishad"
                    value={form.union_parishad}
                    onChange={(e) => updateForm('union_parishad', e.target.value)}
                  >
                    <option value="">{t('submit.placeholderUP')}</option>
                    {unionParishads.map((up) => (
                      <option key={up.id} value={up.id}>
                        {up.name} — {up.upazila}, {up.district}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="subject">{t('submit.labelSubject')}</label>
                  <input
                    id="subject"
                    type="text"
                    placeholder={t('submit.placeholderSubject')}
                    value={form.subject}
                    onChange={(e) => updateForm('subject', e.target.value)}
                    maxLength={300}
                  />
                  <span className="form-help">{form.subject.length}/300</span>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="body">{t('submit.labelDesc')}</label>
                  <textarea
                    id="body"
                    placeholder={t('submit.placeholderDesc')}
                    value={form.body}
                    onChange={(e) => updateForm('body', e.target.value)}
                    rows={6}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Identity */}
            {step === 1 && (
              <div className="form-step">
                <h3 className="form-step-title">{t('submit.identityTitle')}</h3>

                <div className="identity-options">
                  <label
                    className={`identity-option glass-card ${form.is_anonymous ? 'identity-selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="identity"
                      checked={form.is_anonymous}
                      onChange={() => updateForm('is_anonymous', true)}
                    />
                    <div className="identity-content">
                      <h4>{t('submit.identityAnonTitle')}</h4>
                      <p>{t('submit.identityAnonDesc')}</p>
                    </div>
                  </label>

                  <label
                    className={`identity-option glass-card ${!form.is_anonymous ? 'identity-selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="identity"
                      checked={!form.is_anonymous}
                      onChange={() => updateForm('is_anonymous', false)}
                    />
                    <div className="identity-content">
                      <h4>{t('submit.identityNidTitle')}</h4>
                      <p>{t('submit.identityNidDesc')}</p>
                    </div>
                  </label>
                </div>

                {!form.is_anonymous && (
                  <div className="nid-upload-section animate-fade-in">
                    <div className="form-group">
                      <label className="form-label">{t('submit.nidUploadLabel')}</label>
                      {form.nid_image_url ? (
                        <div className="nid-uploaded">
                          <HiOutlineCheckCircle size={20} />
                          <span>{t('submit.nidUploaded')}</span>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              updateForm('nid_image_url', '');
                              updateForm('nid_image_object_key', '');
                            }}
                          >
                            {t('common.remove')}
                          </button>
                        </div>
                      ) : (
                        <div
                          className="file-drop-zone"
                          onClick={() => document.getElementById('nid-input').click()}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files[0];
                            if (file) handleNIDUpload(file);
                          }}
                        >
                          <HiOutlineCloudArrowUp size={32} />
                          <p>{t('submit.nidUploadZone')}</p>
                          <span className="form-help">{t('submit.nidUploadHelp')}</span>
                          <input
                            id="nid-input"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            hidden
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) handleNIDUpload(file);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Attachments */}
            {step === 2 && (
              <div className="form-step">
                <h3 className="form-step-title">{t('submit.attachTitle')}</h3>
                <p className="form-step-desc">{t('submit.attachDesc')}</p>

                <div
                  className="file-drop-zone"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFileUpload([...e.dataTransfer.files]);
                  }}
                >
                  <HiOutlineCloudArrowUp size={32} />
                  <p>{t('submit.attachZone')}</p>
                  <span className="form-help">{t('submit.attachHelp')}</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    multiple
                    hidden
                    onChange={(e) => handleFileUpload([...e.target.files])}
                  />
                </div>

                {/* Uploading Files */}
                {uploadingFiles.map((file) => (
                  <div key={file.id} className="file-item">
                    <span className="file-name">{file.name}</span>
                    <div className="file-progress">
                      <div className="file-progress-bar" style={{ width: `${file.progress}%` }} />
                    </div>
                    <span className="file-progress-text">{file.progress}%</span>
                  </div>
                ))}

                {/* Uploaded Files */}
                {form.attachments.map((att, i) => (
                  <div key={i} className="file-item file-item-done">
                    <HiOutlineCheckCircle size={16} className="file-done-icon" />
                    <span className="file-name">{att.file_name}</span>
                    <span className="file-size">{formatFileSize(att.file_size)}</span>
                    <button className="file-remove" onClick={() => removeAttachment(i)}>
                      <HiOutlineXMark size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Step 4: Review */}
            {step === 3 && (
              <div className="form-step">
                <h3 className="form-step-title">{t('submit.reviewTitle')}</h3>

                <div className="review-grid">
                  <div className="review-item">
                    <span className="review-label">{t('submit.labelUP')}</span>
                    <span className="review-value">
                      {unionParishads.find((up) => up.id === form.union_parishad)?.name || form.union_parishad}
                    </span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">{t('submit.labelSubject')}</span>
                    <span className="review-value">{form.subject}</span>
                  </div>
                  <div className="review-item review-item-full">
                    <span className="review-label">{t('submit.labelDesc')}</span>
                    <span className="review-value review-body">{form.body}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">{t('submit.reviewType')}</span>
                    <span className="review-value">
                      {form.is_anonymous ? t('submit.identityAnonTitle') : t('submit.identityNidTitle')}
                    </span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">{t('submit.reviewAttachments')}</span>
                    <span className="review-value">{form.attachments.length} {t('submit.reviewFiles')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="form-nav">
              {step > 0 && (
                <Button variant="ghost" onClick={() => setStep(step - 1)}>
                  <HiOutlineArrowLeft size={18} />
                  {t('common.back')}
                </Button>
              )}
              <div className="form-nav-spacer" />
              {step < steps.length - 1 ? (
                <Button
                  variant="primary"
                  disabled={!canProceed()}
                  onClick={() => setStep(step + 1)}
                >
                  {t('common.next')}
                  <HiOutlineArrowRight size={18} />
                </Button>
              ) : (
                <Button
                  variant="primary"
                  loading={loading}
                  onClick={handleSubmit}
                >
                  {t('submit.btnSubmit')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
