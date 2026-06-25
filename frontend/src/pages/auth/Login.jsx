import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { HiOutlineEnvelope } from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import './Login.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error('Please enter username and password');
      return;
    }

    setLoading(true);
    try {
      const claims = await login(username, password);
      toast.success('Welcome back!');

      if (claims.is_up_member || claims.is_chairman) {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(detail || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
      </div>

      <div className="login-container animate-scale-in">
        <div className="login-card glass-card">
          <div className="login-header">
            <div className="login-logo">
              <HiOutlineEnvelope size={28} />
            </div>
            <h1 className="login-title">Welcome Back</h1>
            <p className="login-subtitle">Sign in to your PostBox account</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-username">Username</label>
              <input
                id="login-username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
            >
              Sign In
            </Button>
          </form>

          <div className="login-footer">
            <p>
              Don&apos;t have an account?{' '}
              <Link to="/submit">Submit a complaint</Link> with NID verification to get one automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
