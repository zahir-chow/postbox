import { Link } from 'react-router-dom';
import { HiOutlineEnvelope, HiOutlineMagnifyingGlass, HiOutlineShieldCheck, HiOutlineClock, HiOutlineBell, HiOutlineUserGroup } from 'react-icons/hi2';
import './Home.css';

export default function Home() {
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
              Secure & Anonymous
            </div>
            <h1 className="hero-title">
              Your Voice Matters.{' '}
              <span className="gradient-text">Make It Heard.</span>
            </h1>
            <p className="hero-subtitle">
              Smart Union Postbox empowers citizens to file complaints with their
              Union Parishad — anonymously or with NID verification. Track progress
              in real-time.
            </p>
            <div className="hero-actions">
              <Link to="/submit" className="btn btn-primary btn-lg" id="cta-submit">
                <HiOutlineEnvelope size={20} />
                <span className="btn-label">Submit a Complaint</span>
              </Link>
              <Link to="/track" className="btn btn-outline btn-lg" id="cta-track">
                <HiOutlineMagnifyingGlass size={20} />
                <span className="btn-label">Track Your Complaint</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works" id="how-it-works">
        <div className="container">
          <h2 className="section-title animate-fade-in">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="section-subtitle animate-fade-in">
            Three simple steps to make your voice heard
          </p>

          <div className="steps-grid">
            <div className="step-card glass-card animate-fade-in-up stagger-1">
              <div className="step-number">01</div>
              <div className="step-icon">
                <HiOutlineEnvelope size={32} />
              </div>
              <h3 className="step-title">Submit Your Complaint</h3>
              <p className="step-desc">
                Fill out a simple form with your complaint details. Choose to remain
                anonymous or verify with your NID for faster processing.
              </p>
            </div>

            <div className="step-card glass-card animate-fade-in-up stagger-2">
              <div className="step-number">02</div>
              <div className="step-icon">
                <HiOutlineClock size={32} />
              </div>
              <h3 className="step-title">Track Progress</h3>
              <p className="step-desc">
                Receive a unique tracking token. Use it anytime to check the current
                status and see the full timeline of your complaint.
              </p>
            </div>

            <div className="step-card glass-card animate-fade-in-up stagger-3">
              <div className="step-number">03</div>
              <div className="step-icon">
                <HiOutlineBell size={32} />
              </div>
              <h3 className="step-title">Get Resolution</h3>
              <p className="step-desc">
                Your Union Parishad reviews and acts on complaints. The Chairman
                handles escalated issues for faster resolution.
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
                <h4>Fully Anonymous</h4>
                <p>Your identity is protected. No registration needed.</p>
              </div>
            </div>
            <div className="feature-item animate-fade-in stagger-2">
              <HiOutlineUserGroup size={24} className="feature-icon" />
              <div>
                <h4>NID Verification</h4>
                <p>Verify with your National ID for priority processing.</p>
              </div>
            </div>
            <div className="feature-item animate-fade-in stagger-3">
              <HiOutlineClock size={24} className="feature-icon" />
              <div>
                <h4>Real-time Updates</h4>
                <p>Track your complaint status live, anytime.</p>
              </div>
            </div>
            <div className="feature-item animate-fade-in stagger-4">
              <HiOutlineBell size={24} className="feature-icon" />
              <div>
                <h4>Instant Notifications</h4>
                <p>Admin dashboard receives real-time alerts.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="container">
          <p>&copy; {new Date().getFullYear()} Smart Union Postbox. Built for the people of Bangladesh.</p>
        </div>
      </footer>
    </div>
  );
}
