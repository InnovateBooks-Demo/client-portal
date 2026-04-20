import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import { useAuth } from '../context/AuthContext';
import { CheckCircle2, AlertCircle, Loader2, Upload, File as FileIcon, X, ChevronRight, ChevronLeft, Plus, Trash2, RefreshCcw } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';

export default function CompanyDetails() {
  const { profile, loading, refreshProfile } = useProfile();
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  
  const [localData, setLocalData] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [savingStep, setSavingStep] = useState(false);
  const [toast, setToast] = useState(null); // { message, type }

  const [uploadingDoc, setUploadingDoc] = useState(null);
  const [sectionErrors, setSectionErrors] = useState({ legal: {}, address: {}, contacts: {}, tax: {}, documents: {} });

  const steps = [
    { id: 'legal', title: 'Legal Information' },
    { id: 'address', title: 'Address Details' },
    { id: 'contacts', title: 'Contact Details' },
    { id: 'tax', title: 'Tax Configuration' }
  ];

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const validatePanGst = (pan, gstin) => {
    if (!pan || !gstin) return false;
    const cleanPan = pan.trim().toUpperCase();
    const cleanGstin = gstin.trim().toUpperCase();
    if (cleanGstin.length !== 15) return false;
    const extractedPan = cleanGstin.slice(2, 12);
    return extractedPan === cleanPan;
  };

  const validateLegalStep = (legal, documents) => {
    const errors = {};
    if (!legal) return { _general: "Missing legal data" };

    if (!legal.legal_name) errors.legal_name = "Legal name is required";
    if (!legal.pan) errors.pan = "PAN is required";
    if (!legal.constitution_type) errors.constitution_type = "Select constitution type";

    // PAN format
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (legal.pan && !panRegex.test(legal.pan.toUpperCase())) {
      errors.pan = "Invalid PAN format (e.g. ABCDE1234F)";
    }

    // 🔥 Conditional GSTIN logic: Required unless GST type is exempt
    const gstType = localData?.tax?.gst_type || 'regular';
    const requiresGST = gstType !== 'exempt';

    if (requiresGST && !legal.gstin) {
      errors.gstin = "GSTIN is required for your selected tax type";
    }

    // GSTIN format check
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/;
    if (legal.gstin) {
      if (!gstinRegex.test(legal.gstin.toUpperCase())) {
        errors.gstin = "Invalid GSTIN format";
      }

      // 🔥 Single Source of Truth check (replaces extractedPan/slice logic)
      if (!localData.tax?.pan_gst_valid) {
        errors.pan_gst = "PAN does not match GSTIN";
      }
    }

    // REQUIRED DOCUMENTS
    if (!documents?.pan_card) errors.pan_card = "PAN Card required";
    if (requiresGST && !documents?.gst_certificate) errors.gst_certificate = "GST Certificate required";
    if (['Private Limited', 'Public Limited', 'LLP'].includes(legal.constitution_type) && !documents?.incorporation_certificate) {
       errors.incorporation_certificate = "Incorporation Certificate required";
    }

    return errors;
  };

  useEffect(() => {
    if (profile) {
      setLocalData(profile);
    }
  }, [profile]);

  // 🔥 SAFE AUTO-SYNC: Source of Truth for pan_gst_valid
  useEffect(() => {
    const pan = localData?.legal?.pan;
    const gstin = localData?.legal?.gstin;
    const isValid = validatePanGst(pan, gstin);

    // 🔒 Condition prevents infinite loops
    if (localData?.tax?.pan_gst_valid !== isValid) {
      setLocalData(prev => ({
        ...prev,
        tax: {
          ...prev.tax,
          pan_gst_valid: isValid
        }
      }));
    }
  }, [localData?.legal?.pan, localData?.legal?.gstin, localData?.tax?.pan_gst_valid]);

  const handleInputChange = (section, field, value) => {
    setLocalData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    
    if (sectionErrors[section]?.[field]) {
      setSectionErrors(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: null
        }
      }));
    }
  };

  // Nested address field handler: handleAddressFieldChange('registered', 'city', 'Mumbai')
  const handleAddressFieldChange = (addressType, field, value) => {
    setLocalData(prev => {
      // 1. Update the target field
      const nextData = {
        ...prev,
        address: {
          ...prev.address,
          [addressType]: {
            ...prev.address[addressType],
            [field]: value,
            // If the user manually edits a field, break the relationship
            same_as: field === 'same_as' ? value : '' 
          }
        }
      };

      // 2. Cascade Sync Logic (Real-time Mirroring)
      const currentRegistered = nextData.address.registered;
      const currentBilling = nextData.address.billing;

      // Sync Billing if it's mirrored from Registered
      if (addressType === 'registered' && nextData.address.billing?.same_as === 'registered') {
        nextData.address.billing = { ...structuredClone(currentRegistered), same_as: 'registered' };
      }

      // Sync Shipping if it's mirrored from Billing or Registered
      if (nextData.address.shipping?.same_as === 'billing') {
        nextData.address.shipping = { ...structuredClone(nextData.address.billing), same_as: 'billing' };
      } else if (nextData.address.shipping?.same_as === 'registered') {
        nextData.address.shipping = { ...structuredClone(nextData.address.registered), same_as: 'registered' };
      }

      return nextData;
    });

    // Clear errors
    if (sectionErrors.address?.[addressType]) {
      setSectionErrors(prev => ({
        ...prev,
        address: { ...prev.address, [addressType]: null, [addressType + '_pincode']: null }
      }));
    }
  };

  const handleSameAsToggle = (addressType, sourceType) => {
    setLocalData(prev => {
      const isAlreadySame = prev.address[addressType]?.same_as === sourceType;
      
      if (isAlreadySame) {
        // Uncheck: Keep current data but remove the link
        return {
          ...prev,
          address: {
            ...prev.address,
            [addressType]: { ...prev.address[addressType], same_as: '' }
          }
        };
      }

      // Check: Deep copy sourced data IMMEDIATELY
      const sourceData = prev.address[sourceType];
      return {
        ...prev,
        address: {
          ...prev.address,
          [addressType]: { ...structuredClone(sourceData), same_as: sourceType }
        }
      };
    });
  };

  const addLocation = () => {
    setLocalData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        additional_locations: [
          ...(prev.address.additional_locations || []),
          { line1: '', line2: '', city: '', state: '', pincode: '', same_as: '' }
        ]
      }
    }));
  };

  const removeLocation = (index) => {
    setLocalData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        additional_locations: prev.address.additional_locations.filter((_, i) => i !== index)
      }
    }));
  };

  const handleLocationFieldChange = (index, field, value) => {
    setLocalData(prev => {
      const locs = [...(prev.address.additional_locations || [])];
      locs[index] = { ...locs[index], [field]: value };
      return {
        ...prev,
        address: { ...prev.address, additional_locations: locs }
      };
    });
  };

  const handleContactFieldChange = (contactType, field, value) => {
    setLocalData(prev => ({
      ...prev,
      contacts: {
        ...prev.contacts,
        [contactType]: {
          ...(prev.contacts[contactType] || {}),
          [field]: value
        }
      }
    }));
    const errorKey = `${contactType}.${field}`;
    if (sectionErrors.contacts?.[errorKey]) {
      setSectionErrors(prev => ({ ...prev, contacts: { ...prev.contacts, [errorKey]: null } }));
    }
  };

  const REQUIRED_DOCS = [
    { key: "pan_card", label: "PAN Card" },
    { key: "gst_certificate", label: "GST Registration Certificate" },
    { key: "incorporation_certificate", label: "Certificate of Incorporation" },
  ];

  const handleUpload = async (documentType, file) => {
    if (!file) return;
    
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg"];
    if (!allowedTypes.includes(file.type)) {
      setSectionErrors(prev => ({ ...prev, documents: { [documentType]: "Only PDF, PNG, and JPG files are allowed." } }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setSectionErrors(prev => ({ ...prev, documents: { [documentType]: "File size exceeds 5MB limit." } }));
      return;
    }

    setUploadingDoc(documentType);
    setSectionErrors(prev => ({ ...prev, documents: { [documentType]: null } }));

    const formData = new FormData();
    formData.append("file", file);
    formData.append("document_type", documentType);

    try {
      const res = await fetch(`${API_BASE}/api/client-portal/profile/upload`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: formData
      });

      if (res.ok) {
        refreshProfile(); 
      } else {
        const errData = await res.json();
        setSectionErrors(prev => ({ ...prev, documents: { [documentType]: errData.detail?.errors?.[documentType] || "Upload failed." } }));
      }
    } catch (err) {
      console.error("Upload error:", err);
      setSectionErrors(prev => ({ ...prev, documents: { [documentType]: "Network error during upload." } }));
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleFinish = async () => {
    // 🔥 SUBMISSION GUARDS (Data Integrity)
    if (!localData?.lead_id) {
      alert("Missing Lead ID linkage. Please reload the page or contact support.");
      return;
    }

    if (localData.tax?.gst_type !== 'exempt' && !localData.tax?.pan_gst_valid) {
      showToast("PAN-GST mismatch detected. Please correct in Legal step before submitting.", "error");
      return;
    }

    const payload = {
      ...localData,
      lead_id: localData.lead_id
    };

    console.log("--- SUBMISSION DIAGNOSTICS ---");
    console.log("LEAD_ID:", payload.lead_id);
    console.log("PAN:", payload.legal?.pan);
    console.log("GSTIN:", payload.legal?.gstin);
    console.log("FINAL TAX OBJECT:", payload.tax);
    console.log("FINAL PAYLOAD:", payload);

    try {
      const res = await fetch(`${API_BASE}/api/client-portal/onboarding/submit/me`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success || res.ok) {
        alert("Submitted for review");
        navigate("/dashboard");
      } else {
        const serverErrors = data.detail?.errors || {};
        const msg = data.detail?.message || "Submission failed.";
        console.log("🔥 FULL ERROR:", data);
        alert(`${msg} Please fix errors in: ${Object.keys(serverErrors).join(", ")}`);
        setSectionErrors(prev => ({ ...prev, ...serverErrors }));
      }
    } catch (err) {
      console.error(err);
      alert("Network error during submission.");
    }
  };

  const handleNext = async () => {
    const currentSection = steps[currentStep].id;
    
    // 🔥 STEP 1: HARD GATING (Legal Info Validation)
    if (currentStep === 0) {
      const errors = validateLegalStep(localData.legal, localData.documents);
      if (Object.keys(errors).length > 0) {
        console.log("LEGAL VALIDATION FAILED", errors);
        showToast("Please complete required legal details correctly", "error");
        setSectionErrors(prev => ({ ...prev, legal: errors }));
        return; // BLOCK PROGRESSION
      }
    }

    // Client-side validation gating for Tax (Critical)
    if (currentSection === 'tax') {
      const tax = localData.tax || {};
      const gstin = localData.legal?.gstin || '';
      
      let localErrs = {};
      
      if (!tax.gst_type) localErrs.gst_type = "GST Type is required";
      if (gstin && !tax.pan_gst_valid) localErrs._general = "PAN does not match GSTIN. Please correct in Legal Step.";
      if (tax.tds_applicable) {
        if (!tax.tds_section) localErrs.tds_section = "TDS Section is required";
        if (!tax.tan) localErrs.tan = "TAN is required";
      }
      if (tax.gst_type === 'sez' && !tax.lut_number) localErrs.lut_number = "LUT Number is mandatory for SEZ";
      
      if (Object.keys(localErrs).length > 0) {
        setSectionErrors(prev => ({ ...prev, [currentSection]: localErrs }));
        return;
      }

      // State update is now handled by the auto-sync useEffect
    }

    setSavingStep(true);
    
    try {
      // Safe to use localData[currentSection] because useEffect keeps it in sync
      const res = await fetch(`${API_BASE}/api/client-portal/profile/${currentSection}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(localData[currentSection])
      });

      if (res.ok) {
        setSectionErrors(prev => ({ ...prev, [currentSection]: {} }));
        refreshProfile();
        
        // Check mandatory docs for Legal step before proceeding
        if (currentSection === 'legal') {
           const uploadedDocs = localData.documents || {};
           const missingDocs = REQUIRED_DOCS.filter(doc => !uploadedDocs[doc.key]);
           
           if (missingDocs.length > 0) {
              setSectionErrors(prev => ({ 
                ...prev, 
                [currentSection]: { _general: `Please upload all required documents (${missingDocs.map(d => d.label).join(', ')}) before proceeding.` } 
              }));
              return; // Block progression
           }
        }

        // Check address_proof for Address step before proceeding
        if (currentSection === 'address') {
           const uploadedDocs = localData.documents || {};
           if (!uploadedDocs['address_proof']) {
              setSectionErrors(prev => ({ 
                ...prev, 
                [currentSection]: { _general: 'Please upload Address Proof before proceeding.' } 
              }));
              return;
           }
        }

        // Check authorization_letter + id_proof for Contacts step
        if (currentSection === 'contacts') {
           const uploadedDocs = localData.documents || {};
           const contactMissing = [];
           if (!uploadedDocs['authorization_letter']) contactMissing.push('Authorization Letter');
           if (!uploadedDocs['id_proof']) contactMissing.push('ID Proof');
           if (contactMissing.length > 0) {
              setSectionErrors(prev => ({ 
                ...prev, 
                [currentSection]: { _general: `Please upload: ${contactMissing.join(', ')} before proceeding.` } 
              }));
              return;
           }
        }

        if (currentStep < steps.length - 1) {
          setCurrentStep(curr => curr + 1);
        } else {
          await handleFinish();
        }
      } else if (res.status === 400) {
        const errorData = await res.json();
        const serverErrors = errorData.detail?.errors || {};
        setSectionErrors(prev => ({ ...prev, [currentSection]: serverErrors }));
      } else {
        setSectionErrors(prev => ({ ...prev, [currentSection]: { _general: "An unexpected error occurred." } }));
      }
    } catch (err) {
      console.error(`Error saving ${currentSection}:`, err);
      setSectionErrors(prev => ({ ...prev, [currentSection]: { _general: "Network error saving data." } }));
    } finally {
      setSavingStep(false);
    }
  };

  const currentSection = steps[currentStep].id;
  const generalError = sectionErrors[currentSection]?._general;

  if (loading && !localData) {
    return (
      <div className="portal-layout dashboard-theme">
        {/* Toast Container */}
        {toast && (
          <div className="toast-container">
            <div className={`toast ${toast.type === 'error' ? 'toast-error' : ''}`}>
              {toast.type === 'error' ? <AlertCircle size={18} color="#ef4444" /> : <CheckCircle2 size={18} color="#10b981" />}
              <span style={{ fontWeight: 600 }}>{toast.message}</span>
            </div>
          </div>
        )}

        <aside className="sidebar">
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
        </aside>
      </div>
    );
  }

  if (!localData) return null;

  return (
    <div className="page-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Step {currentStep + 1} of {steps.length}
          </span>
          <div style={{ height: '1px', background: '#e2e8f0', flex: 1 }} />
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>{steps[currentStep].title}</h1>
      </header>

      {/* 🔥 ADMIN FEEDBACK BANNER */}
      {localData && localData.review_status === "changes_requested" && (
        <div style={{ 
          background: '#FFF7ED', 
          border: '1px solid #FED7AA', 
          padding: '1.5rem', 
          borderRadius: '16px', 
          marginBottom: '2rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'flex-start'
        }}>
          <div style={{ 
            width: '40px', height: '40px', borderRadius: '10px', background: '#FFEDD5', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EA580C',
            flexShrink: 0
          }}>
            <RefreshCcw size={20} />
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.25rem 0', color: '#9A3412', fontWeight: 800, fontSize: '0.95rem' }}>Changes Requested by Admin</h4>
            <p style={{ margin: 0, color: '#C2410C', fontSize: '0.9rem', fontWeight: 600, fontStyle: 'italic' }}>
              "{localData.review_notes || "Please correct the highlighted fields and resubmit."}"
            </p>
          </div>
        </div>
      )}

      {generalError && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '1rem', borderRadius: '12px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontWeight: 600 }}>
          <AlertCircle size={18} /> {generalError}
        </div>
      )}

      {/* STEP 1: LEGAL INFORMATION */}
      {currentStep === 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
          {/* Left Column - Inputs */}
          <div>
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '2rem', display: 'grid', gap: '1.25rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <InputField label="Legal Name" value={localData.legal.legal_name} error={sectionErrors.legal.legal_name} onChange={(v) => handleInputChange('legal', 'legal_name', v)} />
              <InputField label="PAN" value={localData.legal.pan} error={sectionErrors.legal.pan} onChange={(v) => handleInputChange('legal', 'pan', v)} />
              <InputField label="GSTIN" value={localData.legal.gstin} error={sectionErrors.legal.gstin} onChange={(v) => handleInputChange('legal', 'gstin', v)} />
              <InputField label="CIN / LLPIN" value={localData.legal.cin} error={sectionErrors.legal.cin} onChange={(v) => handleInputChange('legal', 'cin', v)} placeholder="If applicable" />
              <InputField label="Date of Incorporation" type="date" value={localData.legal.incorporation_date} error={sectionErrors.legal.incorporation_date} onChange={(v) => handleInputChange('legal', 'incorporation_date', v)} />
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: sectionErrors.legal.constitution_type ? '#ef4444' : '#475569' }}>Constitution Type</label>
                <select 
                  value={localData.legal.constitution_type} 
                  onChange={(e) => handleInputChange('legal', 'constitution_type', e.target.value)}
                  style={{ 
                    padding: '0.75rem 1rem', 
                    borderRadius: '12px', 
                    border: sectionErrors.legal.constitution_type ? '2px solid #ef4444' : '1px solid #cbd5e1', 
                    fontSize: '0.9rem',
                    background: sectionErrors.legal.constitution_type ? '#fef2f2' : 'white',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                >
                  <option value="">Select Constitution Type</option>
                  <option value="Private Limited">Private Limited Company</option>
                  <option value="Public Limited">Public Limited Company</option>
                  <option value="LLP">Limited Liability Partnership (LLP)</option>
                  <option value="Partnership">Partnership Firm</option>
                  <option value="Proprietorship">Sole Proprietorship</option>
                  <option value="HUF">HUF</option>
                  <option value="Trust">Trust / Society</option>
                </select>
                {sectionErrors.legal.constitution_type && (
                  <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <AlertCircle size={12} /> {sectionErrors.legal.constitution_type}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Documents */}
          <div>
            <div style={{ background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '2rem' }}>
              <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Required Documents</h3>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {REQUIRED_DOCS.map(doc => (
                  <DocumentUploadCard 
                    key={doc.key}
                    docType={doc.key}
                    docLabel={doc.label}
                    localData={localData}
                    uploadingDoc={uploadingDoc}
                    sectionErrors={sectionErrors}
                    handleUpload={handleUpload}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: ADDRESS DETAILS */}
      {currentStep === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
          {/* Left Column - Address Forms */}
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {/* Registered Office Address */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Registered Office Address</h3>
              {sectionErrors.address?.registered && <p style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, margin: '0 0 0.75rem 0' }}><AlertCircle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />{sectionErrors.address.registered}</p>}
              {sectionErrors.address?.registered_pincode && <p style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, margin: '0 0 0.75rem 0' }}><AlertCircle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />{sectionErrors.address.registered_pincode}</p>}
              <AddressFormBlock
                data={localData.address.registered || {}}
                onChange={(field, value) => handleAddressFieldChange('registered', field, value)}
                disabled={false}
              />
            </div>

            {/* Additional Locations */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Additional Places of Business <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8' }}>(Optional)</span></h3>
                <button onClick={addLocation} style={{ background: '#e0eeff', color: '#033F99', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Plus size={14} /> Add Location
                </button>
              </div>
              {(localData.address.additional_locations || []).length === 0 && (
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>No additional locations added.</p>
              )}
              {(localData.address.additional_locations || []).map((loc, idx) => (
                <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Location {idx + 1}</span>
                    <button onClick={() => removeLocation(idx)} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '0.3rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                  <AddressFormBlock
                    data={loc}
                    onChange={(field, value) => handleLocationFieldChange(idx, field, value)}
                    disabled={false}
                  />
                </div>
              ))}
            </div>

            {/* Billing Address */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Billing Address</h3>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                  <input type="checkbox" checked={localData.address.billing?.same_as === 'registered'} onChange={() => handleSameAsToggle('billing', 'registered')} style={{ width: '1rem', height: '1rem' }} />
                  Same as Registered
                </label>
              </div>
              {sectionErrors.address?.billing && <p style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, margin: '0 0 0.75rem 0' }}><AlertCircle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />{sectionErrors.address.billing}</p>}
              <AddressFormBlock
                data={localData.address.billing || {}}
                onChange={(field, value) => handleAddressFieldChange('billing', field, value)}
                disabled={localData.address.billing?.same_as === 'registered'}
              />
            </div>

            {/* Shipping Address */}
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Shipping Address</h3>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                  <input type="checkbox" checked={localData.address.shipping?.same_as === 'billing'} onChange={() => handleSameAsToggle('shipping', 'billing')} style={{ width: '1rem', height: '1rem' }} />
                  Same as Billing
                </label>
              </div>
              {sectionErrors.address?.shipping && <p style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 600, margin: '0 0 0.75rem 0' }}><AlertCircle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />{sectionErrors.address.shipping}</p>}
              <AddressFormBlock
                data={localData.address.shipping || {}}
                onChange={(field, value) => handleAddressFieldChange('shipping', field, value)}
                disabled={localData.address.shipping?.same_as === 'billing'}
              />
            </div>
          </div>

          {/* Right Column - Document Upload */}
          <div>
            <div style={{ background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '2rem', position: 'sticky', top: '2rem' }}>
              <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Required Documents</h3>
              <DocumentUploadCard
                docType="address_proof"
                docLabel="Address Proof"
                localData={localData}
                uploadingDoc={uploadingDoc}
                sectionErrors={sectionErrors}
                handleUpload={handleUpload}
              />
              <p style={{ margin: '1rem 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>Accepted: Electricity Bill, Rent Agreement, Utility Bill</p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: CONTACT DETAILS */}
      {currentStep === 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
          {/* Left — Contact Forms */}
          <div style={{ display: 'grid', gap: '1.5rem' }}>

            {/* Primary Contact */}
            <ContactFormBlock
              title="Primary Contact"
              subtitle="Sales / Business point of contact"
              data={localData.contacts?.primary || {}}
              onChange={(field, value) => handleContactFieldChange('primary', field, value)}
              errors={{
                name: sectionErrors.contacts?.['primary.name'],
                email: sectionErrors.contacts?.['primary.email'],
              }}
              showDesignation={false}
            />

            {/* Finance Contact */}
            <ContactFormBlock
              title="Finance Contact"
              subtitle="Used for invoicing and payment communication"
              data={localData.contacts?.finance || {}}
              onChange={(field, value) => handleContactFieldChange('finance', field, value)}
              errors={{
                name: sectionErrors.contacts?.['finance.name'],
                email: sectionErrors.contacts?.['finance.email'],
              }}
              highlightEmail
              showDesignation={false}
            />

            {/* Authorized Signatory */}
            <ContactFormBlock
              title="Authorized Signatory"
              subtitle="Person legally authorized to sign contracts on behalf of the organization"
              data={localData.contacts?.authorized_signatory || {}}
              onChange={(field, value) => handleContactFieldChange('authorized_signatory', field, value)}
              errors={{
                name: sectionErrors.contacts?.['authorized_signatory.name'],
                email: sectionErrors.contacts?.['authorized_signatory.email'],
              }}
              showDesignation
            />
          </div>

          {/* Right — Document Upload */}
          <div>
            <div style={{ background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '2rem', position: 'sticky', top: '2rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Required Documents</h3>
              <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.8rem', color: '#64748b' }}>Required to verify authorization and identity.</p>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <DocumentUploadCard
                  docType="authorization_letter"
                  docLabel="Authorization Letter"
                  localData={localData}
                  uploadingDoc={uploadingDoc}
                  sectionErrors={sectionErrors}
                  handleUpload={handleUpload}
                />
                <DocumentUploadCard
                  docType="id_proof"
                  docLabel="ID Proof (Aadhaar / Passport / Driving License)"
                  localData={localData}
                  uploadingDoc={uploadingDoc}
                  sectionErrors={sectionErrors}
                  handleUpload={handleUpload}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: TAX CONFIGURATION */}
      {currentStep === 3 && (() => {
        const tax = localData.tax || {};
        const gstin = localData.legal?.gstin || '';
        const pan = localData.legal?.pan || '';
        const panGstValid = !!tax.pan_gst_valid;
        const panGstMismatch = gstin && pan && !panGstValid;
        const isSez = tax.gst_type?.toLowerCase() === 'sez';

        const selStyle = (hasErr) => ({
          padding: '0.75rem 1rem', borderRadius: '12px',
          border: hasErr ? '2px solid #ef4444' : '1px solid #cbd5e1',
          fontSize: '0.9rem', background: hasErr ? '#fef2f2' : 'white',
          outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit'
        });

        return (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
            {/* LEFT — Tax Form */}
            <div style={{ display: 'grid', gap: '1.5rem' }}>

              {/* GST Type */}
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>GST Classification</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: sectionErrors.tax?.gst_type ? '#ef4444' : '#475569' }}>GST Type *</label>
                  <select value={tax.gst_type || ''} onChange={(e) => handleInputChange('tax', 'gst_type', e.target.value)} style={selStyle(!!sectionErrors.tax?.gst_type)}>
                    <option value="">Select GST Type</option>
                    <option value="regular">Regular</option>
                    <option value="composition">Composition</option>
                    <option value="sez">SEZ (Special Economic Zone)</option>
                    <option value="exempt">Exempt</option>
                  </select>
                  {sectionErrors.tax?.gst_type && <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><AlertCircle size={12} />{sectionErrors.tax.gst_type}</span>}
                  {/* PAN-GST Match Badge */}
                {gstin && pan && (
                  <div style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: panGstValid ? '#f0fdf4' : '#fef2f2', border: `1px solid ${panGstValid ? '#bbf7d0' : '#fecaca'}`, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    {panGstValid
                      ? <><CheckCircle2 size={16} color="#16a34a" /><span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 700 }}>PAN-GST Match Verified</span></>
                      : <><AlertCircle size={16} color="#ef4444" /><span style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 700 }}>PAN-GST Mismatch</span><span style={{ fontSize: '0.8rem', color: '#64748b' }}>- Update PAN or GSTIN in Legal step</span></>
                    }
                  </div>
                )}    </div>

                {/* LUT (SEZ only) */}
                {isSez && (
                  <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: sectionErrors.tax?.lut_number ? '#ef4444' : '#475569' }}>
                      LUT Number * <span style={{ fontWeight: 400, color: '#64748b', fontSize: '0.8rem' }}>(Mandatory for SEZ)</span>
                    </label>
                    <input value={tax.lut_number || ''} onChange={(e) => handleInputChange('tax', 'lut_number', e.target.value)} placeholder="LUT reference number" style={{ padding: '0.75rem 1rem', borderRadius: '12px', border: sectionErrors.tax?.lut_number ? '2px solid #ef4444' : '1px solid #cbd5e1', fontSize: '0.9rem', background: sectionErrors.tax?.lut_number ? '#fef2f2' : 'white', outline: 'none' }} />
                    {sectionErrors.tax?.lut_number && <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><AlertCircle size={12} />{sectionErrors.tax.lut_number}</span>}
                  </div>
                )}
              </div>

              {/* TDS Configuration */}
              <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>TDS Applicability</h3>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Does this company deduct TDS before payment?</p>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                    <div onClick={() => handleInputChange('tax', 'tds_applicable', !tax.tds_applicable)} style={{ width: '44px', height: '24px', borderRadius: '12px', background: tax.tds_applicable ? '#033F99' : '#cbd5e1', position: 'relative', transition: 'background 0.2s', cursor: 'pointer', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', top: '3px', left: tax.tds_applicable ? '23px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: tax.tds_applicable ? '#033F99' : '#94a3b8' }}>{tax.tds_applicable ? 'Yes' : 'No'}</span>
                  </label>
                </div>

                {tax.tds_applicable && (
                  <div style={{ display: 'grid', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: sectionErrors.tax?.tds_section ? '#ef4444' : '#475569' }}>TDS Section *</label>
                      <select value={tax.tds_section || ''} onChange={(e) => handleInputChange('tax', 'tds_section', e.target.value)} style={selStyle(!!sectionErrors.tax?.tds_section)}>
                        <option value="">Select TDS Section</option>
                        <option value="194C">194C — Contractor payments</option>
                        <option value="194J">194J — Professional / Technical services</option>
                        <option value="194H">194H — Commission / Brokerage</option>
                        <option value="194I">194I — Rent</option>
                      </select>
                      {sectionErrors.tax?.tds_section && <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><AlertCircle size={12} />{sectionErrors.tax.tds_section}</span>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: sectionErrors.tax?.tan ? '#ef4444' : '#475569' }}>TAN *</label>
                      <input value={tax.tan || ''} onChange={(e) => handleInputChange('tax', 'tan', e.target.value.toUpperCase())} placeholder="e.g. ABCD01234E" maxLength={10} style={{ padding: '0.75rem 1rem', borderRadius: '12px', border: sectionErrors.tax?.tan ? '2px solid #ef4444' : '1px solid #cbd5e1', fontSize: '0.9rem', background: sectionErrors.tax?.tan ? '#fef2f2' : 'white', outline: 'none', textTransform: 'uppercase' }} />
                      {sectionErrors.tax?.tan && <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><AlertCircle size={12} />{sectionErrors.tax.tan}</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT — Compliance Info Panel */}
            <div>
              <div style={{ background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '2rem', position: 'sticky', top: '2rem' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>Compliance Reference</h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {[
                    { icon: '📋', title: 'GST Type', desc: 'Determines your tax filing structure and invoice format. Regular = monthly/quarterly returns. Composition = flat rate.' },
                    { icon: '🔗', title: 'PAN–GST Match', desc: 'Characters 3–12 of your GSTIN must exactly match your PAN. Mismatch indicates incorrect registration.' },
                    { icon: '💸', title: 'TDS Applicability', desc: 'If TDS applies, your company deducts tax before making payment. TAN is mandatory for filing TDS returns.' },
                    { icon: '🏭', title: 'SEZ & LUT', desc: 'SEZ units must furnish a Letter of Undertaking (LUT) to supply goods/services without payment of IGST.' }
                  ].map((item) => (
                    <div key={item.title} style={{ background: 'white', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>{item.title}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: '1.5' }}>{item.desc}</p>
                    </div>
                  ))}

                  {/* Live Validation Badges */}
                  <div style={{ paddingTop: '1rem', borderTop: '1px dashed #e2e8f0' }}>
                    <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Validation Status</p>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                      <Badge ok={!!tax.gst_type} label="GST Type Selected" />
                      {gstin && <Badge ok={panGstValid} label="PAN-GST Verified" failLabel="PAN-GST Mismatch" />}
                      {tax.tds_applicable && <Badge ok={!!(tax.tds_section && tax.tan && tax.tan.length === 10)} label="TDS Configured" />}
                      {isSez && <Badge ok={!!tax.lut_number} label="LUT Provided" />}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* NAVIGATION BAR */}
      <div className="wizard-footer" style={{ 
        marginTop: '3rem', 
        paddingTop: '1.5rem', 
        borderTop: '1px solid #e2e8f0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <button 
          className="btn btn-ghost"
          onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
          disabled={currentStep === 0 || savingStep}
          style={{ 
            background: 'white', 
            color: '#475569', 
            border: '1px solid #cbd5e1', 
            padding: '0.75rem 1.5rem', 
            borderRadius: '12px', 
            fontWeight: 700, 
            fontSize: '0.9rem', 
            cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
            opacity: currentStep === 0 ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <ChevronLeft size={18} /> Back
        </button>
        
        <button 
          className="btn btn-primary"
          onClick={currentStep === steps.length - 1 ? handleFinish : handleNext}
          disabled={savingStep || (currentStep === 0 && Object.keys(validateLegalStep(localData.legal, localData.documents)).length > 0)}
          style={{ 
            background: '#033F99', 
            color: 'white', 
            border: 'none', 
            padding: '0.75rem 2rem', 
            borderRadius: '12px', 
            fontWeight: 700, 
            fontSize: '0.95rem', 
            cursor: savingStep ? 'not-allowed' : 'pointer',
            opacity: savingStep ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 6px -1px rgba(3, 63, 153, 0.2)'
          }}
        >
          {savingStep ? <Loader2 size={18} className="animate-spin" /> : (currentStep === steps.length - 1 ? 'Finish Profile' : 'Save & Continue')}
          {!savingStep && currentStep < steps.length - 1 && <ChevronRight size={18} />}
        </button>
      </div>
    </div>
  );
}

function DocumentUploadCard({ docType, docLabel, localData, uploadingDoc, sectionErrors, handleUpload }) {
  const uploadedDoc = localData.documents?.[docType];
  const isUploading = uploadingDoc === docType;
  const errorMsg = sectionErrors.documents?.[docType];

  return (
    <div style={{ border: errorMsg ? '1px solid #fecaca' : '1px solid #cbd5e1', borderRadius: '12px', padding: '1.25rem', background: errorMsg ? '#fef2f2' : 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: errorMsg ? '0.75rem' : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileIcon size={20} color={uploadedDoc ? '#10b981' : '#64748b'} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1e293b' }}>{docLabel}</h4>
            {uploadedDoc ? (
              <span style={{ fontSize: '0.8rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.2rem', fontWeight: 600 }}>
                <CheckCircle2 size={14} /> Uploaded
              </span>
            ) : (
              <span style={{ fontSize: '0.8rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.2rem', fontWeight: 600 }}>
                <X size={14} /> Missing
              </span>
            )}
          </div>
        </div>
        
        <div>
          {uploadedDoc ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
              <label style={{ cursor: 'pointer', background: 'white', border: '1px solid #e2e8f0', padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, color: '#475569', transition: 'background 0.2s' }}>
                {isUploading ? <Loader2 size={14} className="animate-spin" /> : 'Replace'}
                <input type="file" style={{ display: 'none' }} accept=".pdf,.png,.jpeg,.jpg" onChange={(e) => handleUpload(docType, e.target.files[0])} disabled={isUploading} />
              </label>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', maxWidth: '100px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={uploadedDoc.file_name}>
                {uploadedDoc.file_name}
              </span>
            </div>
          ) : (
            <label style={{ cursor: 'pointer', background: '#e0eeff', color: '#033F99', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', opacity: isUploading ? 0.7 : 1 }}>
              {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {isUploading ? 'Uploading' : 'Upload'}
              <input type="file" style={{ display: 'none' }} accept=".pdf,.png,.jpeg,.jpg" onChange={(e) => handleUpload(docType, e.target.files[0])} disabled={isUploading} />
            </label>
          )}
        </div>
      </div>
      {errorMsg && (
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <AlertCircle size={14} /> {errorMsg}
        </p>
      )}
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type = "text", isTextArea = false, error }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: error ? '#ef4444' : '#475569' }}>{label}</label>
      {isTextArea ? (
        <textarea 
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ 
            padding: '0.75rem 1rem', 
            borderRadius: '12px', 
            border: error ? '2px solid #ef4444' : '1px solid #cbd5e1', 
            fontSize: '0.9rem',
            minHeight: '80px',
            resize: 'vertical',
            fontFamily: 'inherit',
            background: error ? '#fef2f2' : 'white',
            outline: 'none'
          }}
        />
      ) : (
        <input 
          type={type}
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ 
            padding: '0.75rem 1rem', 
            borderRadius: '12px', 
            border: error ? '2px solid #ef4444' : '1px solid #cbd5e1', 
            fontSize: '0.9rem',
            background: error ? '#fef2f2' : 'white',
            outline: 'none'
          }}
        />
      )}
      {error && (
        <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <AlertCircle size={12} /> {error}
        </span>
      )}
    </div>
  );
}

function AddressFormBlock({ data, onChange, disabled }) {
  const fieldStyle = (isDisabled) => ({
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    border: '1px solid #cbd5e1',
    fontSize: '0.9rem',
    background: isDisabled ? '#f1f5f9' : 'white',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    color: isDisabled ? '#94a3b8' : '#0f172a',
    cursor: isDisabled ? 'not-allowed' : 'text'
  });

  const labelStyle = { fontSize: '0.85rem', fontWeight: 600, color: '#475569' };

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <label style={labelStyle}>Address Line 1 *</label>
        <input value={data.line1 || ''} onChange={(e) => onChange('line1', e.target.value)} disabled={disabled} style={fieldStyle(disabled)} placeholder="Building, Street" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <label style={labelStyle}>Address Line 2</label>
        <input value={data.line2 || ''} onChange={(e) => onChange('line2', e.target.value)} disabled={disabled} style={fieldStyle(disabled)} placeholder="Area, Landmark" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={labelStyle}>City *</label>
          <input value={data.city || ''} onChange={(e) => onChange('city', e.target.value)} disabled={disabled} style={fieldStyle(disabled)} placeholder="City" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={labelStyle}>State *</label>
          <input value={data.state || ''} onChange={(e) => onChange('state', e.target.value)} disabled={disabled} style={fieldStyle(disabled)} placeholder="State" />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxWidth: '50%' }}>
        <label style={labelStyle}>Pincode *</label>
        <input value={data.pincode || ''} onChange={(e) => onChange('pincode', e.target.value)} disabled={disabled} style={fieldStyle(disabled)} placeholder="6-digit Pincode" maxLength={6} />
      </div>
    </div>
  );
}

function ContactFormBlock({ title, subtitle, data, onChange, errors = {}, showDesignation = false, highlightEmail = false }) {
  const inputStyle = (hasError) => ({
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    border: hasError ? '2px solid #ef4444' : '1px solid #cbd5e1',
    fontSize: '0.9rem',
    background: hasError ? '#fef2f2' : 'white',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box'
  });

  const labelStyle = (hasError, highlight) => ({
    fontSize: '0.85rem',
    fontWeight: 600,
    color: hasError ? '#ef4444' : highlight ? '#dc6f00' : '#475569',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem'
  });

  return (
    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>{title}</h3>
        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>{subtitle}</p>
      </div>
      <div style={{ display: 'grid', gap: '1rem' }}>
        {/* Name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={labelStyle(!!errors.name, false)}>Full Name *</label>
          <input value={data.name || ''} onChange={(e) => onChange('name', e.target.value)} style={inputStyle(!!errors.name)} placeholder="Full Name" />
          {errors.name && <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><AlertCircle size={12} />{errors.name}</span>}
        </div>

        {/* Email */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={labelStyle(!!errors.email, highlightEmail)}>
            Email *
            {highlightEmail && <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#fff7ed', color: '#dc6f00', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid #fdba74' }}>Required for invoicing</span>}
          </label>
          <input type="email" value={data.email || ''} onChange={(e) => onChange('email', e.target.value)} style={inputStyle(!!errors.email)} placeholder="email@company.com" />
          {errors.email && <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}><AlertCircle size={12} />{errors.email}</span>}
        </div>

        {/* Phone */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={labelStyle(false, false)}>Phone</label>
          <input type="tel" value={data.phone || ''} onChange={(e) => onChange('phone', e.target.value)} style={inputStyle(false)} placeholder="+91 XXXXX XXXXX" />
        </div>

        {/* Designation (Authorized Signatory only) */}
        {showDesignation && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={labelStyle(false, false)}>
              Designation
              <span title="Person legally allowed to sign contracts" style={{ cursor: 'help', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>ⓘ</span>
            </label>
            <input value={data.designation || ''} onChange={(e) => onChange('designation', e.target.value)} style={inputStyle(false)} placeholder="e.g. Managing Director, CEO" />
          </div>
        )}
      </div>
    </div>
  );
}

function Badge({ ok, label, failLabel }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.75rem', borderRadius: '8px', background: ok ? '#f0fdf4' : '#fef2f2', border: `1px solid ${ok ? '#bbf7d0' : '#fecaca'}` }}>
      {ok
        ? <CheckCircle2 size={14} color="#16a34a" />
        : <X size={14} color="#ef4444" />
      }
      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: ok ? '#16a34a' : '#ef4444' }}>
        {ok ? label : (failLabel || label)}
      </span>
    </div>
  );
}
