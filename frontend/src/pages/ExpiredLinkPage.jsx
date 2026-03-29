import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  AlertCircle, 
  Send, 
  ArrowLeft, 
  CheckCircle2, 
  Mail,
  RefreshCw,
  Clock
} from "lucide-react";

const ExpiredLinkPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleRequestNewLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const API_BASE_URL = window.location.origin.replace(":3002", ":5000"); // Standard mapping
      const response = await fetch(`${API_BASE_URL}/api/client-portal/request-new-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          expired_token: token,
          email: email // Optional verification
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.detail || "Failed to renew link. Please contact support.");
      }
    } catch (err) {
      setError("Network error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-xl bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-700">
        
        {/* Header Decor */}
        <div className="h-3 bg-gradient-to-r from-[#033F99] via-blue-500 to-indigo-600" />
        
        <div className="p-12 sm:p-16 text-center">
          {!success ? (
            <>
              <div className="w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 text-rose-500 relative">
                <Clock className="w-12 h-12" />
                <div className="absolute -top-1 -right-1 bg-white p-1.5 rounded-full shadow-sm">
                   <AlertCircle className="w-5 h-5 text-rose-600" />
                </div>
              </div>

              <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">
                Access Link Expired
              </h1>
              <p className="text-slate-500 font-medium text-lg mb-12 leading-relaxed">
                For your security, contract access links expire after 48 hours. 
                Don't worry—you can request a fresh link below.
              </p>

              <form onSubmit={handleRequestNewLink} className="space-y-6 text-left">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">
                    Verify Your Registered Email
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-colors group-focus-within:text-[#033F99]" />
                    <input 
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. james@company.com"
                      className="w-full h-16 bg-slate-50 border-2 border-slate-100 rounded-[1.25rem] pl-14 pr-6 text-slate-900 font-bold focus:outline-none focus:border-[#033F99] focus:bg-white transition-all shadow-inner"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-700 text-sm font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-16 bg-[#033F99] text-white font-black rounded-[1.25rem] shadow-xl shadow-blue-900/10 hover:bg-[#022D6E] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:active:scale-100 group"
                >
                  {loading ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      REQUEST NEW ACCESS LINK
                      <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="animate-in fade-in zoom-in-95 duration-500">
              <div className="w-24 h-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 text-emerald-500">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-4">
                New Link Sent!
              </h1>
              <p className="text-slate-500 font-medium text-lg mb-10 leading-relaxed max-w-sm mx-auto">
                Check your inbox. We've sent a fresh access link to <strong className="text-slate-900">{email}</strong>.
              </p>
              
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-left mb-10">
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Can't find it?
                 </p>
                 <ul className="text-sm text-slate-600 space-y-2 font-medium">
                    <li>• Check your <strong>Spam</strong> or <strong>Promotions</strong> folder</li>
                    <li>• Verify the email address matches our records</li>
                    <li>• Wait 2-3 minutes for the delivery</li>
                 </ul>
              </div>

              <button
                onClick={() => setSuccess(false)}
                className="inline-flex items-center gap-2 text-[#033F99] font-black text-sm hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                TRY AGAIN
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-12 text-center text-slate-400 font-medium text-sm">
        <p>© 2026 InnovateBook. Secure Compliance Portal.</p>
        <p className="mt-2">Need direct help? <a href="mailto:support@innovatebook.com" className="text-[#033F99] hover:underline">Contact Support</a></p>
      </div>
    </div>
  );
};

export default ExpiredLinkPage;
