import './Spinner.css';

export default function Spinner({ size = 'md', className = '' }) {
  return (
    <div className={`spinner-container ${className}`}>
      <div className={`spinner spinner-${size}`}>
        <div className="spinner-ring" />
        <div className="spinner-ring" />
        <div className="spinner-ring" />
      </div>
    </div>
  );
}

export function PageSpinner() {
  return (
    <div className="page-spinner">
      <Spinner size="lg" />
      <p className="page-spinner-text">Loading…</p>
    </div>
  );
}
