import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HiOutlineSquares2X2,
  HiOutlineDocumentText,
  HiOutlineBell,
} from 'react-icons/hi2';
import './Sidebar.css';

export default function Sidebar() {
  const { user, isChairman } = useAuth();

  const navItems = [
    { to: '/dashboard', icon: <HiOutlineSquares2X2 size={20} />, label: 'Overview', end: true },
    { to: '/dashboard/complaints', icon: <HiOutlineDocumentText size={20} />, label: 'Complaints' },
  ];

  return (
    <aside className="sidebar" id="dashboard-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-role-badge">
          {isChairman ? '👑 Chairman' : '🏛️ UP Member'}
        </div>
        <p className="sidebar-user-name">{user?.display_name || user?.username}</p>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`
            }
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            <span className="sidebar-link-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-status">
          <HiOutlineBell size={16} />
          <span>Real-time alerts active</span>
        </div>
      </div>
    </aside>
  );
}
