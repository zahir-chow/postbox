import api from './api';
import axios from 'axios';

export const complaintService = {
  /**
   * Submit a new complaint (anonymous or NID-verified)
   */
  async submitComplaint(data) {
    const { data: response } = await api.post('/complaints/submit/', data);
    return response;
  },

  /**
   * Track a complaint by its public tracking token
   */
  async trackComplaint(trackingToken) {
    const { data } = await api.get(`/complaints/track/${trackingToken}/`);
    return data;
  },

  /**
   * Request a presigned S3 upload URL
   */
  async getPresignedUrl({ fileName, contentType, folder = 'attachments' }) {
    const { data } = await api.post('/complaints/upload/presigned-url/', {
      file_name: fileName,
      content_type: contentType,
      folder,
    });
    return data;
  },

  /**
   * Upload a file directly to S3 using the presigned URL
   */
  async uploadToS3(presignedUrl, file, contentType, onProgress) {
    await axios.put(presignedUrl, file, {
      headers: { 'Content-Type': contentType },
      onUploadProgress: onProgress
        ? (e) => onProgress(Math.round((e.loaded * 100) / e.total))
        : undefined,
    });
  },

  /**
   * List complaints (filtered by user role server-side)
   */
  async listComplaints({ status, priority, is_anonymous, page = 1 } = {}) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (priority) params.append('priority', priority);
    if (is_anonymous !== undefined) params.append('is_anonymous', is_anonymous);
    params.append('page', page);

    const { data } = await api.get(`/complaints/?${params.toString()}`);
    return data;
  },

  /**
   * Get full complaint details
   */
  async getComplaintDetail(id) {
    const { data } = await api.get(`/complaints/${id}/`);
    return data;
  },

  /**
   * Update complaint status (admin only)
   */
  async updateComplaintStatus(id, { status, notes, priority, admin_notes }) {
    const payload = { status };
    if (notes) payload.notes = notes;
    if (priority) payload.priority = priority;
    if (admin_notes !== undefined) payload.admin_notes = admin_notes;

    const { data } = await api.patch(`/complaints/${id}/status/`, payload);
    return data;
  },

  /**
   * Get admin dashboard statistics
   */
  async getAdminStats() {
    const { data } = await api.get('/complaints/admin/stats/');
    return data;
  },

  /**
   * Get list of Union Parishads
   */
  async getUnionParishads() {
    const { data } = await api.get('/complaints/union-parishads/');
    return data;
  },
};

export default complaintService;
