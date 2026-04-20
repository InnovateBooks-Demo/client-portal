import React, { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import { CheckCircle, XCircle, Loader2, Mail, ExternalLink } from "lucide-react";

const ProposalRespond = () => {
  const { proposalId } = useParams();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const action = queryParams.get("action");

  const [status, setStatus] = useState("loading"); // loading, success, error
  const [result, setResult] = useState(null);
  const processedRef = useRef(false);

  useEffect(() => {
    const processAction = async () => {
      if (processedRef.current) return;
      processedRef.current = true;

      if (!action || !["accept", "reject"].includes(action)) {
        setStatus("error");
        setResult("Invalid action requested.");
        return;
      }

      try {
        const API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "";
        const response = await fetch(
          `${API_URL}/api/proposals/proposal/respond/${proposalId}?action=${action}`
        );
        const data = await response.json();

        if (data.success) {
          setStatus("success");
          setResult(data);
        } else {
          setStatus("error");
          setResult(data.detail || "Failed to process proposal response.");
        }
      } catch (err) {
        console.error("Proposal response error:", err);
        setStatus("error");
        setResult("A network error occurred. Please try again or contact support.");
      }
    };

    processAction();
  }, [proposalId, action]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md bg-white p-12 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col items-center animate-in fade-in zoom-in duration-500">
        {status === "loading" && (
          <>
            <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 animate-pulse">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tight uppercase tracking-widest">
              Processing Response
            </h2>
            <p className="text-slate-500 font-medium italic">
              Updating your proposal status...
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className={`h-16 w-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg ${
              action === "accept" 
                ? "bg-emerald-100 text-emerald-600 shadow-emerald-100" 
                : "bg-slate-100 text-slate-600 shadow-slate-100"
            }`}>
              {action === "accept" ? <CheckCircle className="h-8 w-8" /> : <XCircle className="h-8 w-8" />}
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tight uppercase tracking-widest">
              Proposal {action === "accept" ? "Accepted" : "Rejected"}
            </h2>
            <p className="text-slate-500 font-medium mb-8">
              {action === "accept" 
                ? "Thank you for accepting the proposal. We've notified our team to proceed with the next steps."
                : "The proposal has been rejected. We'll get in touch to understand your requirements better."}
            </p>
            <div className="w-full flex flex-col gap-3">
              <a
                href="/dashboard"
                className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                Go to Dashboard
              </a>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="h-16 w-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-rose-100">
              <XCircle className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tight uppercase tracking-widest">
              Action Failed
            </h2>
            <p className="text-slate-500 font-medium mb-8">
              {result}
            </p>
            <div className="w-full flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-4 bg-[#033F99] text-white font-bold rounded-2xl hover:bg-[#022d6e] transition-all shadow-lg flex items-center justify-center gap-2"
              >
                Try Again
              </button>
              <a
                href="mailto:support@synexos.com"
                className="text-sm font-bold text-slate-400 hover:text-slate-600 transition-all flex items-center justify-center gap-1 mt-4"
              >
                <Mail className="h-4 w-4" /> Contact Support
              </a>
            </div>
          </>
        )}
      </div>
      
      <p className="mt-8 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
        Powered by <span className="text-slate-600">Synexos Portal</span>
      </p>
    </div>
  );
};

export default ProposalRespond;
