import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useLanguage } from '../../context/LanguageContext';
import { HiOutlineEnvelope } from 'react-icons/hi2';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import './Login.css';

export default function Login() {
  const { login } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error(
        language === 'en' ? 'Please enter username and password' : 'অনুগ্রহ করে ইউজারনেম এবং পাসওয়ার্ড লিখুন'
      );
      return;
    }

    setLoading(true);
    try {
      const claims = await login(username, password);
      toast.success(language === 'en' ? 'Welcome back!' : 'স্বাগতম!');

      if (claims.is_up_member || claims.is_chairman) {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(
        detail || (language === 'en' ? 'Invalid username or password' : 'ভুল ইউজারনেম অথবা পাসওয়ার্ড')
      );
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
            <h1 className="login-title">{t('login.welcomeBack')}</h1>
            <p className="login-subtitle">{t('login.signInSubtitle')}</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-username">{t('login.username')}</label>
              <input
                id="login-username"
                type="text"
                placeholder={t('login.placeholderUsername')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">{t('login.password')}</label>
              <input
                id="login-password"
                type="password"
                placeholder={t('login.placeholderPassword')}
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
              {t('login.signInBtn')}
            </Button>
          </form>

          <div className="login-footer">
            <p>
              {t('login.dontHaveAccount')}{' '}
              <Link to="/submit">{t('home.submitCTA')}</Link> {t('login.nidHelp')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
