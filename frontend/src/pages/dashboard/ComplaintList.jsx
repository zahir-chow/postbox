import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import complaintService from '../../api/complaintService';
import { StatusBadge, PriorityBadge } from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatDate, formatRelativeTime, STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../utils/helpers';
import { HiOutlineFunnel, HiOutlineArrowPath } from 'react-icons/hi2';
import './ComplaintList.css';

export default function ComplaintList() {
  const navigate = useNavigate();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ status: '', priority: '', is_anonymous: '' });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadComplaints();
  }, [page, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const params = { page };
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.is_anonymous) params.is_anonymous = filters.is_anonymous;

      const data = await complaintService.listComplaints(params);
      // Handle both paginated and non-paginated responses
      if (data.results) {
        setComplaints(data.results);
        setTotalPages(Math.ceil((data.count || 0) / 25));
      } else {
        setComplaints(Array.isArray(data) ? data : []);
      }
    } catch {
      setComplaints([]);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({ status: '', priority: '', is_anonymous: '' });
    setPage(1);
  };

  const hasActiveFilters = filters.status || filters.priority || filters.is_anonymous;

  return (
    <div className="complaint-list-page">
      <div className="cl-header">
        <div>
          <h1>Complaints</h1>
          <p className="dashboard-subtitle">Manage all submitted complaints</p>
        </div>
        <div className="cl-header-actions">
          <Button
            variant="ghost"
            size="sm"
            icon={<HiOutlineArrowPath size={16} />}
            onClick={loadComplaints}
          >
            Refresh
          </Button>
          <Button
            variant={showFilters ? 'glass' : 'ghost'}
            size="sm"
            icon={<HiOutlineFunnel size={16} />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filter
            {hasActiveFilters && <span className="filter-dot" />}
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="cl-filters glass-card animate-fade-in">
          <div className="cl-filter-group">
            <label className="form-label">Status</label>
            <select
              value={filters.status}
              onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="cl-filter-group">
            <label className="form-label">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => { setFilters(f => ({ ...f, priority: e.target.value })); setPage(1); }}
            >
              <option value="">All Priorities</option>
              {PRIORITY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="cl-filter-group">
            <label className="form-label">Source</label>
            <select
              value={filters.is_anonymous}
              onChange={(e) => { setFilters(f => ({ ...f, is_anonymous: e.target.value })); setPage(1); }}
            >
              <option value="">All Sources</option>
              <option value="true">Anonymous</option>
              <option value="false">Verified</option>
            </select>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>
          )}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <PageSpinner />
      ) : complaints.length === 0 ? (
        <div className="cl-empty glass-card animate-fade-in">
          <p>No complaints found</p>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>Clear Filters</Button>
          )}
        </div>
      ) : (
        <>
          <div className="cl-table-wrapper glass-card animate-fade-in">
            <table className="cl-table" id="complaints-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Complainant</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((c) => (
                  <tr
                    key={c.id}
                    className="cl-row"
                    onClick={() => navigate(`/dashboard/complaints/${c.id}`)}
                  >
                    <td>
                      <div className="cl-subject">
                        <span className="cl-subject-text">{c.subject}</span>
                        {c.attachment_count > 0 && (
                          <span className="cl-attachment-count">📎 {c.attachment_count}</span>
                        )}
                      </div>
                    </td>
                    <td><StatusBadge status={c.status} /></td>
                    <td><PriorityBadge priority={c.priority} /></td>
                    <td>
                      <span className={`cl-source ${c.is_anonymous ? 'cl-anon' : 'cl-verified'}`}>
                        {c.complainant_name}
                      </span>
                    </td>
                    <td>
                      <span className="cl-date" title={formatDate(c.created_at)}>
                        {formatRelativeTime(c.created_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="cl-pagination">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </Button>
              <span className="cl-page-info">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
