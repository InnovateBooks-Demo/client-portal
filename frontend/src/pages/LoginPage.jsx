import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, Loader2, ShieldCheck, ArrowRight, Briefcase, Zap, BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/synexos-logo.png';

const API_BASE = import.meta.env.VITE_API_URL || '';

const slides = [
  {
    icon: <Briefcase size={40} />,
    title: "IB Commerce",
    desc: "Unified commerce solutions. Manage payments, revenue, and client relationships in one connected system."
  },
  {
    icon: <Zap size={40} />,
    title: "Workspace",
    desc: "Centralize your operations. A hub for collaboration, documents, and efficient workflows designed for scale."
  },
  {
    icon: <BarChart3 size={40} />,
    title: "Intelligence",
    desc: "Insights driven by data. Monitor risks and unlock business growth with advanced analytics at your fingertips."
  }
];

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const queryParams = new URLSearchParams(location.search);
  const initialEmail = queryParams.get('email') || '';

  const [form, setForm] = useState({ email: initialEmail, password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Carousel State
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 4500); // Slower carousel
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (queryParams.get('from') === 'onboarding') {
      setError('success:Account created successfully! Please sign in to finalize your setup.');
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/client-portal/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.detail || 'Invalid email or password');
      }

      login(json.access_token);
      
      const redirectPath = queryParams.get('redirect');
      if (redirectPath) {
        navigate(redirectPath);
      } else if (json.user?.contract_id) {
        navigate(`/contracts/${json.user.contract_id}`);
      } else {
        // Fallback to dashboard (or generic state)
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-bg">
      <style>{`
        .fade-in-content {
          animation: fadeEffect 0.3s ease-in-out;
        }
        @keyframes fadeEffect {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      <div className="login-main-card">
        {/* Left Side: Login Form */}
        <div className="login-left-side">
          <div className="login-logo-area" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img
              src={logo}
              alt="Synexos"
              style={{ height: '28px', width: 'auto' }}
            />
            <span className="login-logo-text">Synexos</span>
          </div>

          <div className="login-form-container">
            <h1 className="form-title">Welcome Back</h1>
            <p className="form-subtitle">Access your business operating system.</p>

            {error && (
              <div className="login-error-box">
                <Lock size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="login-input-group">
                <label className="login-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="email"
                    className="login-field"
                    style={{ paddingLeft: '40px' }}
                    placeholder="name@company.com"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="login-input-group" style={{ marginBottom: '2rem' }}>
                <label className="login-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="password"
                    className="login-field"
                    style={{ paddingLeft: '40px' }}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="login-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Loader2 className="spinner" size={18} />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span>Sign In</span>
                    <ArrowRight size={18} />
                  </div>
                )}
              </button>
            </form>

            <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
                Don't have an account? <span style={{ color: '#033F99', fontWeight: 600, cursor: 'pointer' }}>Contact support</span>
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Informational Business Carousel */}
        <div className="login-right-side">
          <div key={activeSlide} className="fade-in-content" style={{ width: '100%', maxWidth: '440px', margin: '0 auto' }}>
            <div className="smart-setup-pill">
              <ShieldCheck size={14} />
              <span>Synexos Platform</span>
            </div>

            <div className="illustration-container">
              <div style={{
                width: '120px',
                height: '120px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <div style={{ color: 'white' }}>
                  {slides[activeSlide].icon}
                </div>
              </div>
            </div>

            <h2 className="login-heading-right">{slides[activeSlide].title}</h2>
            <p className="login-desc-right">
              {slides[activeSlide].desc}
            </p>

            <div className="pagination-dots">
              {slides.map((_, idx) => (
                <div
                  key={idx}
                  className={`dot ${activeSlide === idx ? 'active' : ''}`}
                  onClick={() => setActiveSlide(idx)}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
