import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import DashboardLayout from './components/layout/DashboardLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Pages
import Home from './pages/public/Home';
import SubmitComplaint from './pages/public/SubmitComplaint';
import TrackComplaint from './pages/public/TrackComplaint';
import Login from './pages/auth/Login';
import Dashboard from './pages/dashboard/Dashboard';
import ComplaintList from './pages/dashboard/ComplaintList';
import ComplaintDetail from './pages/dashboard/ComplaintDetail';

import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/submit" element={<SubmitComplaint />} />
          <Route path="/track" element={<TrackComplaint />} />

          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />

          {/* Dashboard Routes (Protected — Admin Only) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requireAdmin>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="complaints" element={<ComplaintList />} />
            <Route path="complaints/:id" element={<ComplaintDetail />} />
          </Route>
        </Routes>

        <Toaster
          position="top-right"
          toastOptions={{
            className: 'toast-custom',
            duration: 4000,
            style: {
              background: 'hsl(222, 28%, 17%)',
              color: 'hsl(220, 20%, 95%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '10px',
              fontFamily: "'Inter', sans-serif",
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
