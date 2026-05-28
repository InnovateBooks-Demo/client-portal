import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
  Lock,
  X,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Briefcase,
  Zap,
  BarChart3
} from 'lucide-react';
import logo from '../assets/synexos-logo-transparent-1.png';

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [resetToken, setResetToken] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    new_password: '',
    confirm_password: ''
  });

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!formData.email) {
      setError("Email is required");
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/client-portal/forgot-password/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.detail || json.message || "Failed to send OTP.");
      }
      if (json.success) {
        setStep(2);
        setResendTimer(60);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setError("Please enter a 6-digit verification code");
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/client-portal/forgot-password/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp_code: otpCode })
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.detail || json.message || "Verification failed. Invalid OTP.");
      }
      if (json.success && json.reset_token) {
        setResetToken(json.reset_token);
        setStep(3);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/client-portal/forgot-password/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.detail || json.message || "Failed to resend OTP.");
      }
      if (json.success) {
        setResendTimer(60);
        setSuccessMsg("A new recovery code has been sent!");
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (formData.new_password !== formData.confirm_password) {
      setError("Passwords do not match");
      return;
    }
    if (formData.new_password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!/[A-Za-z]/.test(formData.new_password) || !/\d/.test(formData.new_password)) {
      setError("Password must contain at least one letter and one number");
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/client-portal/forgot-password/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reset_token: resetToken,
          new_password: formData.new_password,
          confirm_password: formData.confirm_password
        })
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.detail || json.message || "Failed to reset password.");
      }
      if (json.success) {
        setStep(4);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    navigate('/login');
  };

  return (
    <div className="login-page-bg relative min-h-screen overflow-hidden" style={{ padding: 0 }}>
      {/* Blurred background mockup of standalone login card */}
      <div className="absolute inset-0 filter blur-[4px] pointer-events-none select-none flex items-center justify-center p-8">
        <div className="login-main-card">
          {/* Left Side mockup */}
          <div className="login-left-side">
            <div className="login-logo-area" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src={logo}
                alt="SynexOS Logo"
                style={{ height: '48px', width: 'auto', objectFit: 'contain' }}
              />
              <span style={{ fontSize: '1.875rem', fontWeight: 700, fontFamily: 'sans-serif', letterSpacing: '-0.025em' }}>
                <span style={{ color: '#0f172a' }}>Synex</span>
                <span style={{ color: '#033F99' }}>OS</span>
              </span>
            </div>
            <div className="login-form-container">
              <h1 className="form-title">Welcome Back</h1>
              <p className="form-subtitle">Access your business operating system.</p>

              <div className="login-input-group">
                <label className="login-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="email"
                    className="login-field"
                    style={{ paddingLeft: '40px' }}
                    value="name@company.com"
                    readOnly
                  />
                </div>
              </div>

              <div className="login-input-group" style={{ marginBottom: '1.5rem' }}>
                <label className="login-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="password"
                    className="login-field"
                    style={{ paddingLeft: '40px' }}
                    value="••••••••"
                    readOnly
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#033F99' }}>
                    Forgot password?
                  </span>
                </div>
              </div>

              <button type="button" className="login-submit-btn" disabled>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span>Sign In</span>
                  <ArrowRight size={18} />
                </div>
              </button>

              <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
                <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
                  Don't have an account? <span style={{ color: '#033F99', fontWeight: 600 }}>Contact support</span>
                </p>
              </div>
            </div>
          </div>
          {/* Right Side mockup */}
          <div className="login-right-side" style={{ display: 'flex', flexDirection: 'column', justifycontent: 'center' }}>
            <div className="smart-setup-pill">
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
                  <Briefcase size={40} />
                </div>
              </div>
            </div>
            <h2 className="login-heading-right">Workspace</h2>
            <p className="login-desc-right">Centralize your operations. A hub for collaboration, documents, and efficient workflows designed for scale.</p>
          </div>
        </div>
      </div>

      {/* Actual centered Modal Card with dark glass backdrop overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm transition-opacity">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col relative animate-in fade-in zoom-in-95 duration-200">
          
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors z-10"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="p-6 sm:p-8">
            
            {/* Header Section */}
            <div className="mb-6 flex flex-col items-center text-center">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg ${step === 4 ? 'bg-green-600 shadow-green-600/20' : 'bg-[#033F99] shadow-[#033F99]/20'}`}>
                {step === 4 ? (
                  <CheckCircle2 className="h-6 w-6 text-white" />
                ) : (
                  <Lock className="h-6 w-6 text-white" />
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {step === 4 ? "Password Reset Complete" : "Reset Password"}
              </h2>
              <p className="text-sm text-slate-500 mt-2 font-medium">
                {step === 1 && "Enter your email to receive a verification code."}
                {step === 2 && "Enter the verification code sent to your email."}
                {step === 3 && "Create a new strong password."}
                {step === 4 && "Your password has been updated successfully."}
              </p>
            </div>

            <div className="flex-1">
              {error && (
                <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {successMsg && (
                <div className="mb-5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <p className="text-emerald-700 text-sm">{successMsg}</p>
                </div>
              )}

              {/* Step 1: Send OTP */}
              {step === 1 && (
                <form onSubmit={handleSendOtp} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-slate-400" />
                      </div>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-3 py-3 text-sm border border-slate-300 rounded-xl focus:border-[#033F99] focus:ring-2 focus:ring-[#033F99]/20 outline-none transition-all"
                        placeholder="you@company.com"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#033F99] hover:bg-[#022D6E] text-white font-bold py-3 rounded-xl shadow-lg shadow-[#033F99]/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <Loader2 className="animate-spin h-5 w-5 border-2 border-white border-t-transparent" />
                      ) : (
                        <>
                          Send Reset Code <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={loading}
                      className="w-full bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Step 2: Verify OTP */}
              {step === 2 && (
                <div className="flex flex-col items-center justify-center space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="h-4 w-4 text-[#033F99] shrink-0" />
                      <span className="text-sm font-semibold text-slate-700 truncate">{formData.email}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setStep(1); setOtpCode(""); setError(""); }}
                      className="text-xs font-bold text-[#033F99] hover:text-[#022D6E] bg-[#033F99]/10 hover:bg-[#033F99]/20 px-2.5 py-1 rounded-lg transition-colors shrink-0"
                    >
                      Change
                    </button>
                  </div>

                  <div className="w-full mt-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2 text-center">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setOtpCode(val);
                        setError("");
                      }}
                      placeholder="000000"
                      autoFocus
                      className="w-full text-center tracking-[0.5em] text-2xl font-mono px-3 py-4 border border-slate-300 rounded-xl focus:border-[#033F99] focus:ring-2 focus:ring-[#033F99]/20 outline-none transition-all"
                      required
                    />
                  </div>

                  <div className="flex flex-col items-center justify-center w-full gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={loading || otpCode.length !== 6}
                      className="w-full bg-[#033F99] hover:bg-[#022D6E] text-white font-bold py-3 rounded-xl shadow-lg shadow-[#033F99]/30 transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                      {loading ? <Loader2 className="animate-spin h-5 w-5 text-white" /> : "Verify Code"}
                    </button>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendTimer > 0 || loading}
                      className="text-sm text-[#033F99] font-semibold hover:text-[#022D6E] transition-colors disabled:text-slate-400 mt-1"
                    >
                      {resendTimer > 0 ? `Resend Code in ${resendTimer}s` : "Resend Code"}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: New Password */}
              {step === 3 && (
                <form onSubmit={handleResetPassword} className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        name="new_password"
                        value={formData.new_password}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-10 py-3 text-sm border border-slate-300 rounded-xl focus:border-[#033F99] focus:ring-2 focus:ring-[#033F99]/20 outline-none transition-all"
                        placeholder="Min. 8 characters"
                        required
                        minLength={8}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirm_password"
                        value={formData.confirm_password}
                        onChange={handleChange}
                        className="block w-full pl-10 pr-10 py-3 text-sm border border-slate-300 rounded-xl focus:border-[#033F99] focus:ring-2 focus:ring-[#033F99]/20 outline-none transition-all"
                        placeholder="Re-enter password"
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={loading || formData.new_password.length < 8}
                      className="w-full bg-[#033F99] hover:bg-[#022D6E] text-white font-bold py-3 rounded-xl shadow-lg shadow-[#033F99]/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <Loader2 className="animate-spin h-5 w-5 text-white" />
                      ) : (
                        <>
                          Reset Password <Sparkles className="h-4 w-4" />
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      disabled={loading}
                      className="text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors py-2 text-center"
                    >
                      Back
                    </button>
                  </div>
                </form>
              )}

              {/* Step 4: Success Screen */}
              {step === 4 && (
                <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full bg-[#033F99] hover:bg-[#022D6E] text-white font-bold py-3 rounded-xl shadow-lg shadow-[#033F99]/30 transition-all flex items-center justify-center gap-2 mt-4"
                  >
                    Continue to Login <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
