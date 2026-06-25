import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineCloudArrowUp, HiOutlineXMark, HiOutlineClipboardDocument, HiOutlineCheckCircle, HiOutlineArrowLeft, HiOutlineArrowRight } from 'react-icons/hi2';
import Button from '../../components/ui/Button';
import complaintService from '../../api/complaintService';
import { formatFileSize, copyToClipboard } from '../../utils/helpers';
import './SubmitComplaint.css';

const STEPS = ['Details', 'Identity', 'Attachments', 'Review'];

export default function SubmitComplaint() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [unionParishads, setUnionParishads] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [trackingToken, setTrackingToken] = useState('');
  const fileInputRef = useRef(null);

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
        toast.error('Maximum 5 attachments allowed');
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
        toast.success(`${file.name} uploaded`);
      } catch {
        setUploadingFiles((prev) => prev.filter((f) => f.id !== uploadId));
        toast.error(`Failed to upload ${file.name}`);
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
      toast.success('NID image uploaded');
    } catch {
      toast.error('Failed to upload NID image');
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
      toast.success('Complaint submitted successfully!');
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data;
      if (typeof detail === 'string') {
        toast.error(detail);
      } else if (typeof detail === 'object') {
        const firstError = Object.values(detail)[0];
        toast.error(Array.isArray(firstError) ? firstError[0] : String(firstError));
      } else {
        toast.error('Failed to submit complaint');
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
            <h2>Complaint Submitted!</h2>
            <p className="success-message">
              Your complaint has been received. Use the tracking token below to check your status anytime.
            </p>
            <div className="tracking-token-display">
              <code className="tracking-token-value">{trackingToken}</code>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  copyToClipboard(trackingToken);
                  toast.success('Token copied!');
                }}
              >
                <HiOutlineClipboardDocument size={18} />
                Copy
              </button>
            </div>
            <div className="success-actions">
              <Button variant="primary" onClick={() => navigate(`/track?token=${trackingToken}`)}>
                Track My Complaint
              </Button>
              <Button variant="ghost" onClick={() => navigate('/')}>
                Back to Home
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
            <h1>Submit a <span className="gradient-text">Complaint</span></h1>
            <p>Fill in the details below. Your complaint will be reviewed by your Union Parishad.</p>
          </div>

          {/* Step Indicator */}
          <div className="step-indicator animate-fade-in">
            {STEPS.map((label, i) => (
              <div
                key={label}
                className={`step-dot ${i === step ? 'step-active' : ''} ${i < step ? 'step-done' : ''}`}
                onClick={() => i < step && setStep(i)}
              >
                <div className="step-dot-circle">{i < step ? '✓' : i + 1}</div>
                <span className="step-dot-label">{label}</span>
              </div>
            ))}
            <div className="step-line" style={{ '--progress': `${(step / (STEPS.length - 1)) * 100}%` }} />
          </div>

          {/* Form Steps */}
          <div className="submit-form glass-card animate-fade-in-up">
            {/* Step 1: Details */}
            {step === 0 && (
              <div className="form-step">
                <div className="form-group">
                  <label className="form-label" htmlFor="union_parishad">Union Parishad</label>
                  <select
                    id="union_parishad"
                    value={form.union_parishad}
                    onChange={(e) => updateForm('union_parishad', e.target.value)}
                  >
                    <option value="">Select a Union Parishad…</option>
                    {unionParishads.map((up) => (
                      <option key={up.id} value={up.id}>
                        {up.name} — {up.upazila}, {up.district}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="subject">Subject</label>
                  <input
                    id="subject"
                    type="text"
                    placeholder="Brief subject of your complaint…"
                    value={form.subject}
                    onChange={(e) => updateForm('subject', e.target.value)}
                    maxLength={300}
                  />
                  <span className="form-help">{form.subject.length}/300</span>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="body">Description</label>
                  <textarea
                    id="body"
                    placeholder="Describe your complaint in detail…"
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
                <h3 className="form-step-title">How would you like to submit?</h3>

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
                      <h4>🕶️ Anonymous</h4>
                      <p>Your identity will remain completely private. No registration required.</p>
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
                      <h4>🪪 NID Verification</h4>
                      <p>Verify with your National ID for priority processing and an auto-generated account.</p>
                    </div>
                  </label>
                </div>

                {!form.is_anonymous && (
                  <div className="nid-upload-section animate-fade-in">
                    <div className="form-group">
                      <label className="form-label">Upload NID Card Photo</label>
                      {form.nid_image_url ? (
                        <div className="nid-uploaded">
                          <HiOutlineCheckCircle size={20} />
                          <span>NID image uploaded</span>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              updateForm('nid_image_url', '');
                              updateForm('nid_image_object_key', '');
                            }}
                          >
                            Remove
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
                          <p>Click or drag & drop your NID card photo</p>
                          <span className="form-help">JPEG, PNG, or WebP (max 10 MB)</span>
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
                <h3 className="form-step-title">Attach Evidence (Optional)</h3>
                <p className="form-step-desc">Upload photos, documents, or any evidence related to your complaint.</p>

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
                  <p>Click or drag & drop files here</p>
                  <span className="form-help">Up to 5 files — JPEG, PNG, WebP, PDF (max 10 MB each)</span>
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
                <h3 className="form-step-title">Review Your Complaint</h3>

                <div className="review-grid">
                  <div className="review-item">
                    <span className="review-label">Union Parishad</span>
                    <span className="review-value">
                      {unionParishads.find((up) => up.id === form.union_parishad)?.name || form.union_parishad}
                    </span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Subject</span>
                    <span className="review-value">{form.subject}</span>
                  </div>
                  <div className="review-item review-item-full">
                    <span className="review-label">Description</span>
                    <span className="review-value review-body">{form.body}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Submission Type</span>
                    <span className="review-value">
                      {form.is_anonymous ? '🕶️ Anonymous' : '🪪 NID Verified'}
                    </span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Attachments</span>
                    <span className="review-value">{form.attachments.length} file(s)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="form-nav">
              {step > 0 && (
                <Button variant="ghost" onClick={() => setStep(step - 1)}>
                  <HiOutlineArrowLeft size={18} />
                  Back
                </Button>
              )}
              <div className="form-nav-spacer" />
              {step < STEPS.length - 1 ? (
                <Button
                  variant="primary"
                  disabled={!canProceed()}
                  onClick={() => setStep(step + 1)}
                >
                  Next
                  <HiOutlineArrowRight size={18} />
                </Button>
              ) : (
                <Button
                  variant="primary"
                  loading={loading}
                  onClick={handleSubmit}
                >
                  Submit Complaint
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
