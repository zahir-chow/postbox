import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { HiOutlineEnvelope, HiOutlineMagnifyingGlass, HiOutlineArrowRightOnRectangle, HiOutlineSquares2X2, HiOutlineBars3 } from 'react-icons/hi2';
import { useState } from 'react';
import './Navbar.css';

export default function Navbar() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar" id="main-navbar">
      <div className="navbar-inner container">
        <Link to="/" className="navbar-brand">
          <div className="navbar-logo">
            <HiOutlineEnvelope size={24} />
          </div>
          <span className="navbar-brand-text">
            <span className="gradient-text">PostBox</span>
          </span>
        </Link>

        <button
          className="navbar-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation"
        >
          <HiOutlineBars3 size={24} />
        </button>

        <div className={`navbar-menu ${mobileMenuOpen ? 'navbar-menu-open' : ''}`}>
          <div className="navbar-links">
            <Link
              to="/submit"
              className={`navbar-link ${isActive('/submit') ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <HiOutlineEnvelope size={18} />
              Submit
            </Link>
            <Link
              to="/track"
              className={`navbar-link ${isActive('/track') ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <HiOutlineMagnifyingGlass size={18} />
              Track
            </Link>
          </div>

          <div className="navbar-actions">
            {isAuthenticated ? (
              <>
                {isAdmin && (
                  <Link
                    to="/dashboard"
                    className="navbar-link navbar-link-dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <HiOutlineSquares2X2 size={18} />
                    Dashboard
                  </Link>
                )}
                <div className="navbar-user">
                  <div className="navbar-avatar">
                    {(user?.display_name || user?.username || 'U')[0].toUpperCase()}
                  </div>
                  <span className="navbar-username">
                    {user?.display_name || user?.username}
                  </span>
                </div>
                <button className="navbar-logout" onClick={handleLogout} title="Logout">
                  <HiOutlineArrowRightOnRectangle size={20} />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="btn btn-glass btn-sm"
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
