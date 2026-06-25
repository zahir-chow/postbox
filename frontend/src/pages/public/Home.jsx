import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { HiOutlineEnvelope, HiOutlineMagnifyingGlass, HiOutlineShieldCheck, HiOutlineClock, HiOutlineBell, HiOutlineUserGroup } from 'react-icons/hi2';
import './Home.css';

export default function Home() {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero" id="hero-section">
        <div className="hero-bg">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
        </div>
        <div className="container hero-content">
          <div className="hero-text animate-fade-in-up">
            <div className="hero-badge">
              <HiOutlineShieldCheck size={16} />
              {t('home.secureAnonymous')}
            </div>
            <h1 className="hero-title">
              {t('home.titlePart1')}{' '}
              <span className="gradient-text">{t('home.titlePart2')}</span>
            </h1>
            <p className="hero-subtitle">
              {t('home.heroSubtitle')}
            </p>
            <div className="hero-actions">
              {!isAdmin && (
                <Link to="/submit" className="btn btn-primary btn-lg" id="cta-submit">
                  <HiOutlineEnvelope size={20} />
                  <span className="btn-label">{t('home.submitCTA')}</span>
                </Link>
              )}
              <Link to="/track" className="btn btn-outline btn-lg" id="cta-track">
                <HiOutlineMagnifyingGlass size={20} />
                <span className="btn-label">{t('home.trackCTA')}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works" id="how-it-works">
        <div className="container">
          <h2 className="section-title animate-fade-in">
            {t('home.howItWorks')}
          </h2>
          <p className="section-subtitle animate-fade-in">
            {t('home.threeSteps')}
          </p>

          <div className="steps-grid">
            <div className="step-card glass-card animate-fade-in-up stagger-1">
              <div className="step-number">01</div>
              <div className="step-icon">
                <HiOutlineEnvelope size={32} />
              </div>
              <h3 className="step-title">{t('home.step1Title')}</h3>
              <p className="step-desc">
                {t('home.step1Desc')}
              </p>
            </div>

            <div className="step-card glass-card animate-fade-in-up stagger-2">
              <div className="step-number">02</div>
              <div className="step-icon">
                <HiOutlineClock size={32} />
              </div>
              <h3 className="step-title">{t('home.step2Title')}</h3>
              <p className="step-desc">
                {t('home.step2Desc')}
              </p>
            </div>

            <div className="step-card glass-card animate-fade-in-up stagger-3">
              <div className="step-number">03</div>
              <div className="step-icon">
                <HiOutlineBell size={32} />
              </div>
              <h3 className="step-title">{t('home.step3Title')}</h3>
              <p className="step-desc">
                {t('home.step3Desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features" id="features">
        <div className="container">
          <div className="features-grid">
            <div className="feature-item animate-fade-in stagger-1">
              <HiOutlineShieldCheck size={24} className="feature-icon" />
              <div>
                <h4>{t('home.feature1Title')}</h4>
                <p>{t('home.feature1Desc')}</p>
              </div>
            </div>
            <div className="feature-item animate-fade-in stagger-2">
              <HiOutlineUserGroup size={24} className="feature-icon" />
              <div>
                <h4>{t('home.feature2Title')}</h4>
                <p>{t('home.feature2Desc')}</p>
              </div>
            </div>
            <div className="feature-item animate-fade-in stagger-3">
              <HiOutlineClock size={24} className="feature-icon" />
              <div>
                <h4>{t('home.feature3Title')}</h4>
                <p>{t('home.feature3Desc')}</p>
              </div>
            </div>
            <div className="feature-item animate-fade-in stagger-4">
              <HiOutlineBell size={24} className="feature-icon" />
              <div>
                <h4>{t('home.feature4Title')}</h4>
                <p>{t('home.feature4Desc')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="container">
          <p>&copy; {new Date().getFullYear()} {t('home.copyright')}</p>
        </div>
      </footer>
    </div>
  );
}
