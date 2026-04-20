import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';

const ContractClientPage = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    
    const [contract, setContract] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [clientName, setClientName] = useState("");
    const [accepted, setAccepted] = useState(false);
    const [signing, setSigning] = useState(false);
    const [signSuccess, setSignSuccess] = useState(false);

    useEffect(() => {
        const fetchContract = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/commerce/workflow/client-portal/contract/${token}`);
                
                let data = null;
                try {
                    data = await res.json();
                } catch (e) {
                    data = null;
                }

                if (!res.ok) {
                    setError(data?.detail || `Failed to load contract: ${res.status}`);
                    return;
                }

                if (data?.success) {
                    setContract(data.contract);
                    setClientName(data.contract.client_name || "");
                    if (data.contract.status === "SIGNED") {
                        setSignSuccess(true);
                    }
                } else {
                    setError(data?.detail || "Failed to load contract");
                }
            } catch (err) {
                setError("Failed to load contract");
            } finally {
                setLoading(false);
            }
        };
        fetchContract();
    }, [token]);

    const handleSign = async () => {
        if (!accepted || !clientName.trim()) return;
        
        setSigning(true);
        try {
            const res = await fetch(`${API_BASE}/api/commerce/workflow/client-portal/contract/${token}/sign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ client_name: clientName })
            });

            let data = null;
            try {
                data = await res.json();
            } catch (e) {
                data = null;
            }

            if (!res.ok) {
                setError(data?.detail || `Sign failed: ${res.status}`);
                return;
            }

            if (data?.success) {
                setSignSuccess(true);
            } else {
                setError(data?.detail || "Failed to sign contract");
            }
        } catch (err) {
            setError("Failed to sign contract");
        } finally {
            setSigning(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-4" />
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Retrieving Contract...</p>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-red-100 flex flex-col items-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
                <p className="text-slate-600 text-center text-sm">{error}</p>
            </div>
        </div>
    );

    if (signSuccess) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="bg-white p-12 rounded-[2.5rem] shadow-xl max-w-md w-full border border-emerald-100 flex flex-col items-center">
                <CheckCircle className="w-16 h-16 text-emerald-500 mb-6" />
                <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Contract Signed!</h2>
                <p className="text-slate-500 text-center font-medium mb-8">
                    Your agreement has been legally recorded and sealed. A copy will be emailed to you shortly.
                </p>
                <div className="px-6 py-3 bg-emerald-50 text-emerald-700 rounded-full text-sm font-bold uppercase tracking-widest">
                    Handoff Initiated
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto space-y-8">
                
                {/* HEADER */}
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="px-4 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                        Ready for Execution
                    </div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">
                        Final Agreement
                    </h1>
                    <p className="text-slate-500 font-medium">
                        Please review the contract terms below. Value represents {contract.total_value}
                    </p>
                </div>

                {/* DOCUMENT PREVIEW */}
                <div className="bg-white p-8 md:p-12 shadow-2xl rounded-3xl border border-slate-200">
                    <div 
                        className="prose prose-slate max-w-none text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: contract.generated_content }} 
                    />
                </div>

                {/* SIGNATURE BLOCK */}
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 mt-8">
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest mb-6">Digital Signature</h3>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Legal Name</label>
                            <input 
                                type="text"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all font-medium text-slate-900"
                                placeholder="Type your full legal name"
                            />
                        </div>

                        <label className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                            <input 
                                type="checkbox"
                                checked={accepted}
                                onChange={(e) => setAccepted(e.target.checked)}
                                className="mt-1 w-5 h-5 text-slate-900 rounded focus:ring-slate-900"
                            />
                            <span className="text-sm text-slate-600 font-medium">
                                By checking this box and typing my name above, I represent and warrant that I have the authority to bind the entity to this Agreement, and I agree to use electronic signatures as the definitive record of execution.
                            </span>
                        </label>

                        <button 
                            onClick={handleSign}
                            disabled={!accepted || !clientName.trim() || signing}
                            className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none flex justify-center items-center gap-2"
                        >
                            {signing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Accept & Sign Contract"}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ContractClientPage;
