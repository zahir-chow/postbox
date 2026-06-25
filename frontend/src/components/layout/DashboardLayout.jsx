import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../hooks/useWebSocket';
import './DashboardLayout.css';

export default function DashboardLayout() {
  const { isAdmin } = useAuth();

  // Connect WebSocket for real-time notifications
  useWebSocket(isAdmin, (event) => {
    // Events are handled inside the hook with toasts
    // Additional data refresh logic can be added here
  });

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  );
}
