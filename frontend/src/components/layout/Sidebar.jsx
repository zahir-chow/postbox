import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  HiOutlineSquares2X2,
  HiOutlineDocumentText,
  HiOutlineBell,
} from 'react-icons/hi2';
import './Sidebar.css';

export default function Sidebar() {
  const { user, isChairman } = useAuth();
  const { t } = useLanguage();

  const navItems = [
    { to: '/dashboard', icon: <HiOutlineSquares2X2 size={20} />, label: t('sidebar.overview'), end: true },
    { to: '/dashboard/complaints', icon: <HiOutlineDocumentText size={20} />, label: t('sidebar.complaints') },
  ];

  return (
    <aside className="sidebar" id="dashboard-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-role-badge">
          {isChairman ? t('sidebar.chairman') : t('sidebar.upMember')}
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
          <span>{t('sidebar.alertsActive')}</span>
        </div>
      </div>
    </aside>
  );
}
