from fastapi import APIRouter, HTTPException, Depends, Request, UploadFile, File, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone, timedelta
import logging

import hashlib
import json
import os
import uuid
import jwt
from passlib.context import CryptContext
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
JWT_SECRET = os.environ.get("JWT_SECRET_KEY", "client_portal_secret_fallback_key")
JWT_ALGORITHM = "HS256"

# ==========================
# AUDIT ENUM & CONSTANTS
# ==========================
EVENT_TYPES = {
    "CONTRACT_SENT": "contract_sent",
    "PORTAL_OPENED": "portal_opened",
    "LOGIN_SUCCESS": "login_success",
    "ONBOARDING_STARTED": "onboarding_started",
    "ONBOARDING_COMPLETED": "onboarding_completed",
    "DOCUMENT_UPLOADED": "document_uploaded",
    "CONTRACT_SIGNED": "contract_signed",
    "REMINDER_SENT": "reminder_sent",
    "LINK_RENEWED": "link_renewed"
}

# ==========================
# ASYNC EMAIL HELPERS
# ==========================
from services.email_service import send_email

async def notify_onboarding_completed(contract_id: str, client_user: dict, db):
    """Event: Client has filled all required onboarding fields."""
    try:
        # 1. Resolve Sender
        token_doc = await db.revenue_portal_tokens.find_one({"contract_id": contract_id})
        if not token_doc: return
        
        sender_id = token_doc.get("sender_user_id")
        sender = await db.users.find_one({"user_id": sender_id})
        if not sender: return
        
        sender_email = sender.get("email")
        client_name = client_user.get("name") or "A Client"
        
        subject = "Onboarding Completed"
        body = f"""
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #3b82f6;">Client Onboarding Completed</h2>
            <p>Hello,</p>
            <p>Client <strong>{client_name}</strong> ({client_user.get('email')}) has completed all required onboarding information for contract <strong>{contract_id}</strong>.</p>
            <p>The contract is now ready for final review and signature.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 0.8rem; color: #777;">System generated notification from InnovateBook Portal.</p>
        </div>
        """
        
        # Dispatch
        send_email(sender_email, subject, body)
        
        # Audit
        await db.revenue_workflow_audits.insert_one({
            "event_type": "email_sent",
            "email_type": "onboarding_completed",
            "recipient": sender_email,
            "contract_id": contract_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Failed to send onboarding notification: {e}")

async def notify_contract_signed(contract_id: str, client_name: str, client_email: str, timestamp: str, db):
    """Event: Client has digitally signed the contract."""
    try:
        # 1. Resolve Sender
        token_doc = await db.revenue_portal_tokens.find_one({"contract_id": contract_id})
        
        sender_id = token_doc.get("sender_user_id") if token_doc else None
        sender = await db.users.find_one({"user_id": sender_id}) if sender_id else None
        sender_email = sender.get("email") if sender else "ops@innovatebook.com"
        
        # --- Notification to Client ---
        client_subject = "Contract Signed Successfully"
        client_body = f"""
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #10b981;">Contract Signed Successfully</h2>
            <p>Hello {client_name},</p>
            <p>Your contract has been successfully signed and captured in our secure system.</p>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Details:</strong></p>
                <ul style="margin: 10px 0 0 0;">
                    <li>Contract ID: {contract_id}</li>
                    <li>Signed At: {timestamp}</li>
                </ul>
            </div>
            <p>Our team will now proceed with the next steps of your engagement.</p>
            <p>Thank you.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 0.8rem; color: #777;">Secure Transmission from InnovateBook Revenue Cloud.</p>
        </div>
        """
        send_email(client_email, client_subject, client_body)
        
        # --- Notification to Sender ---
        internal_subject = "Client Signed Contract"
        internal_body = f"""
        <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #3b82f6;">Signature Captured</h2>
            <p>Hello,</p>
            <p>Client <strong>{client_name}</strong> has signed the contract <strong>{contract_id}</strong>.</p>
            <p>The lead stage has been automatically progressed to "Handoff".</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 0.8rem; color: #777;">Automated Workflow Execution.</p>
        </div>
        """
        send_email(sender_email, internal_subject, internal_body)
        
        # Audit Logs
        now = datetime.now(timezone.utc).isoformat()
        await db.revenue_workflow_audits.insert_many([
            {
                "event_type": "email_sent",
                "email_type": "contract_signed_client",
                "recipient": client_email,
                "contract_id": contract_id,
                "timestamp": now
            },
            {
                "event_type": "email_sent",
                "email_type": "contract_signed_internal",
                "recipient": sender_email,
                "contract_id": contract_id,
                "timestamp": now
            }
        ])
        
    except Exception as e:
        logger.error(f"Failed to send contract signed notifications: {e}")

async def log_audit_event(db, event_type: str, contract_id: str, user_id: str, org_id: str, request: Request, metadata: dict = None):
    """
    Standardized Audit Logging with snapshot updates on the contract.
    Ensures consistency across internal and client actions.
    """
    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        # 1. Prepare Audit Record
        audit_doc = {
            "event_type": event_type,
            "contract_id": contract_id,
            "user_id": user_id,
            "org_id": org_id,
            "timestamp": now_iso,
            "ip_address": client_ip,
            "metadata": {
                **(metadata or {}),
                "user_agent": user_agent,
                "source": "client_portal" if "sign" in str(request.url) or "onboarding" in str(request.url) else "system"
            }
        }
        await db.revenue_workflow_audits.insert_one(audit_doc)
        
        # 2. Update Contract Snapshot for performance
        await db.revenue_workflow_contracts.update_one(
            {"contract_id": contract_id},
            {"$set": {
                "last_event": event_type,
                "last_activity_at": now_iso
            }}
        )
        
    except Exception as e:
        logger.error(f"Failed to log audit event {event_type} for contract {contract_id}: {e}")

class OnboardingService:
    @staticmethod
    def merge_data(existing: Dict[str, Any], new_payload: Dict[str, Any]) -> Dict[str, Any]:
        """Merge new onboarding fields with existing ones, preserving existing non-null data if not present in new payload."""
        merged = dict(existing) if existing else {}
        
        for k, v in new_payload.items():
            if v is not None and v != "":
                merged[k] = v
                
        merged['updated_at'] = datetime.now(timezone.utc).isoformat()
        return merged

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/client-portal", tags=["Client Portal"])

# NOTE: We inject the database connection via app state in the main application
class ClientDocuments(BaseModel):
    gst_certificate: Optional[str] = None
    pan_card: Optional[str] = None
    agreement_docs: List[str] = []

class OnboardingPayload(BaseModel):
    legal_name: Optional[str] = None
    address: Optional[str] = None
    gst: Optional[str] = None
    billing_contact: Optional[str] = None
    admin_contact: Optional[str] = None
    documents: Optional[ClientDocuments] = None

class SignPayload(BaseModel):
    client_name: str
    client_email: str
    timestamp: str

class ClientSetPasswordPayload(BaseModel):
    token: str
    password: str

class ClientLoginPayload(BaseModel):
    token: str
    password: str

class RenewLinkPayload(BaseModel):
    expired_token: str
    email: Optional[str] = None

async def _get_db(request: Request):
    # Depending on how the main app structures DB DI, this extracts the atlas connection
    # Or just imports the global db object. For this modular app, importing from main is easiest
    import sys
    # If the app was launched from the old backend dir:
    from main import db
    return db

async def get_client_user(credentials: HTTPAuthorizationCredentials = Depends(security), db = Depends(_get_db)):
    """Requires valid JWT token from Client Portal login"""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        org_id = payload.get("org_id")
        
        if not user_id or not org_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
            
        user = await db.client_portal_users.find_one({"user_id": user_id, "org_id": org_id})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
            
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def _validate_token(token: str, db) -> Dict[str, Any]:
    hashed_input = hashlib.sha256(token.encode()).hexdigest()
    token_doc = await db.revenue_portal_tokens.find_one({"token_hash": hashed_input})
    
    if not token_doc:
        raise HTTPException(status_code=403, detail="Access Denied — Link invalid or expired")
        
    # Check expiry
    expiry = datetime.fromisoformat(token_doc["expires_at"])
    if datetime.now(timezone.utc) > expiry:
        raise HTTPException(status_code=403, detail="Access Denied — Link invalid or expired")
        
    if token_doc.get("status") not in ["active", "used"]:
        raise HTTPException(status_code=403, detail="Access Denied — Link invalid or expired")
        
    return token_doc

@router.get("/{token}/handshake")
async def portal_handshake(token: str, request: Request, db = Depends(_get_db)):
    """Validates token and returns related contract/lead/onboarding state"""
    token_doc = await _validate_token(token, db)
    
    contract_id = token_doc["contract_id"]
    lead_id = token_doc["lead_id"]
    org_id = token_doc["org_id"]
    
    # Fetch safe data (exclude internal notes, etc)
    contract = await db.revenue_workflow_contracts.find_one({"contract_id": contract_id})
    lead = await db.revenue_workflow_leads.find_one({"lead_id": lead_id})
    
    if not contract or not lead:
        raise HTTPException(status_code=404, detail="Document data missing")
        
    # Safe objects
    safe_contract = {
        "contract_id": contract.get("contract_id"),
        "party_name": contract.get("party_name"),
        "total_value": contract.get("total_value"),
        "payment_terms": contract.get("payment_terms"),
        "legal_clauses": contract.get("legal_clauses"),
        "contract_status": contract.get("contract_status"), # SIGNED, etc
    }
    
    safe_lead = {
        "company_name": lead.get("company_name"),
        "contact_name": lead.get("contact_name"),
        "contact_email": lead.get("contact_email"),
        "items": lead.get("items") or lead.get("evaluation_data", {}).get("propose", {}).get("items")
    }
    
    onboarding = await db.revenue_workflow_onboarding.find_one({"contract_id": contract_id})
    safe_onboarding = {}
    if onboarding:
        safe_onboarding = {
            "legal_name": onboarding.get("legal_name"),
            "address": onboarding.get("address"),
            "gst": onboarding.get("gst"),
            "billing_contact": onboarding.get("billing_contact"),
            "admin_contact": onboarding.get("admin_contact"),
        }
        
    # Mark as accessed
    await db.revenue_portal_tokens.update_one(
        {"token_hash": token_doc["token_hash"]},
        {"$set": {"last_accessed_at": datetime.now(timezone.utc).isoformat()}}
    )

    # Log Portal Opened Audit
    await log_audit_event(db, EVENT_TYPES["PORTAL_OPENED"], contract_id, None, org_id, request, {"portal_token": token_doc["token_hash"][:8]})
        
    # Check if a client user is already mapped for this email + org_id
    user = await db.client_portal_users.find_one({
        "email": token_doc["email"],
        "org_id": org_id
    })
    user_exists = True if user else False

    return {
        "valid": True,
        "success": True, 
        "user_exists": user_exists,
        "email": token_doc.get("email"),
        "name": token_doc.get("name"),
        "sender_user_id": token_doc.get("sender_user_id") or token_doc.get("created_by"),
        "contract_id": contract_id,
        "lead_id": lead_id,
        "client_name": lead.get("company_name") or "Client",
        "org_id": org_id,
        "expires_at": token_doc.get("expires_at"),
        "status": token_doc.get("status", "active"),
        "data": {
            "contract": safe_contract,
            "lead": safe_lead,
            "onboarding": safe_onboarding
        }
    }

@router.post("/request-new-link")
async def request_new_link(payload: RenewLinkPayload, request: Request, background_tasks: BackgroundTasks, db = Depends(_get_db)):
    """
    Self-service recovery for expired links.
    Validates identity, renews token, and dispatches updated invitation.
    """
    token = payload.expired_token
    hashed_input = hashlib.sha256(token.encode()).hexdigest()
    
    # 1. Resolve Session
    old_token = await db.revenue_portal_tokens.find_one({"token_hash": hashed_input})
    if not old_token:
        raise HTTPException(status_code=404, detail="Link record not found")
        
    contract_id = old_token["contract_id"]
    org_id = old_token["org_id"]
    
    # 2. SECURITY GUARD: SIGNATURE CHECK
    contract = await db.revenue_workflow_contracts.find_one({"contract_id": contract_id})
    if contract and contract.get("contract_status") == "SIGNED":
        raise HTTPException(status_code=400, detail="This contract has already been fully executed.")

    # 3. SECURITY GUARD: EMAIL MATCH (Optional but strong)
    if payload.email and payload.email.lower() != old_token.get("email", "").lower():
        raise HTTPException(status_code=403, detail="Identity verification failed")

    # 4. RATE LIMITING (5 Minutes)
    now = datetime.now(timezone.utc)
    last_renewed_at = old_token.get("last_renewed_at")
    if last_renewed_at:
        last_renewed = datetime.fromisoformat(last_renewed_at)
        if now - last_renewed < timedelta(minutes=5):
            raise HTTPException(status_code=429, detail="A new link was recently sent. Please check your inbox or wait 5 minutes.")

    # 5. GENERATE RENEWAL
    new_raw_token = str(uuid.uuid4())
    new_hashed = hashlib.sha256(new_raw_token.encode()).hexdigest()
    expiry = (now + timedelta(hours=48)).isoformat()
    
    # Invalidate old token status
    await db.revenue_portal_tokens.update_one(
        {"token_hash": hashed_input},
        {"$set": {"status": "expired", "last_renewed_at": now.isoformat()}}
    )
    
    # Create new token record
    new_token_doc = {
        **{k: v for k, v in old_token.items() if k not in ["_id", "token_hash", "expires_at", "last_renewed_at", "status", "created_at"]},
        "token_hash": new_hashed,
        "expires_at": expiry,
        "created_at": now.isoformat(),
        "status": "active"
    }
    await db.revenue_portal_tokens.insert_one(new_token_doc)

    # 6. UPDATE CONTRACT STATUS (REOPENED)
    if contract.get("contract_status") == "EXPIRED":
        await db.revenue_workflow_contracts.update_one(
            {"contract_id": contract_id},
            {"$set": {"contract_status": "REOPENED", "updated_at": now.isoformat()}}
        )

    # 7. DISPATCH UPDATED EMAIL
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3002")
    new_link = f"{frontend_url}/portal/{new_raw_token}"
    
    client_email = old_token["email"]
    subject = "Your Updated Contract Access Link"
    body = f"""
    <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #033F99;">Updated Contract Access</h2>
        <p>Hello {old_token.get('name', 'Client')},</p>
        <p>Your previous access link for contract <strong>{contract_id}</strong> has expired.</p>
        <p>We have generated a new secure link for you to complete your onboarding and signing process:</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="{new_link}" style="background-color: #033F99; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block;">
                Access Contract
            </a>
        </div>
        <p style="font-size: 0.9rem; color: #64748b;">This link is valid for the next 48 hours for your security.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="font-size: 0.8rem; color: #94a3b8;">If you did not request this, please contact our support team.</p>
    </div>
    """
    background_tasks.add_task(send_email, client_email, subject, body)

    # 8. AUDIT LOGGING
    await log_audit_event(db, EVENT_TYPES["LINK_RENEWED"], contract_id, None, org_id, request, {
        "old_token_prefix": hashed_input[:8],
        "new_token_prefix": new_hashed[:8],
        "reason": "self_service_renewal"
    })

    return {"success": True, "message": "A fresh access link has been sent to your registered email."}


@router.post("/set-password")
async def client_set_password(payload: ClientSetPasswordPayload, request: Request, db = Depends(_get_db)):
    token_doc = await _validate_token(payload.token, db)
    
    email = token_doc["email"]
    org_id = token_doc["org_id"]
    
    existing = await db.client_portal_users.find_one({"email": email, "org_id": org_id})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists for this organization. Please login.")
        
    user_id = str(uuid.uuid4())
    hashed_password = pwd_context.hash(payload.password)
    sender_id = token_doc.get("sender_user_id") or token_doc.get("created_by")
    contract_id = token_doc["contract_id"]
    lead_id = token_doc["lead_id"]
    
    now_iso = datetime.now(timezone.utc).isoformat()
    
    new_user = {
        "user_id": user_id,
        "email": email,
        "name": token_doc.get("name"),
        "password_hash": hashed_password,
        "org_id": org_id,
        "created_by": sender_id,
        "lead_ids": [lead_id],
        "contract_ids": [contract_id],
        "created_at": now_iso,
        "last_login": now_iso
    }
    await db.client_portal_users.insert_one(new_user)
    
    access_token = jwt.encode({
        "sub": user_id,
        "org_id": org_id,
        "is_client": True,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "iat": datetime.now(timezone.utc)
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return {"success": True, "access_token": access_token}


@router.post("/login")
async def client_login(payload: ClientLoginPayload, request: Request, db = Depends(_get_db)):
    token_doc = await _validate_token(payload.token, db)
    
    email = token_doc["email"]
    org_id = token_doc["org_id"]
    contract_id = token_doc["contract_id"]
    lead_id = token_doc["lead_id"]
    
    user = await db.client_portal_users.find_one({"email": email, "org_id": org_id})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    if not pwd_context.verify(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    # Append multiple contracts if missing
    if contract_id not in user.get("contract_ids", []):
        await db.client_portal_users.update_one(
            {"_id": user["_id"]},
            {"$addToSet": {"contract_ids": contract_id, "lead_ids": lead_id}}
        )
        
    now_iso = datetime.now(timezone.utc).isoformat()
    await db.client_portal_users.update_one({"_id": user["_id"]}, {"$set": {"last_login": now_iso}})
        
    access_token = jwt.encode({
        "sub": user["user_id"],
        "org_id": org_id,
        "is_client": True,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "iat": datetime.now(timezone.utc)
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    # Log Login Success Audit
    await log_audit_event(db, EVENT_TYPES["LOGIN_SUCCESS"], contract_id, user["user_id"], org_id, request)
        
    return {"success": True, "access_token": access_token}

# ==========================
# NEW DASHBOARD APIs
# ==========================

@router.get("/me")
async def get_client_me(client_user = Depends(get_client_user), db = Depends(_get_db)):
    """Returns the authenticated client profile."""
    # Omit password_hash
    user_data = {k: v for k, v in client_user.items() if k not in ["_id", "password_hash"]}
    return {"success": True, "user": user_data}

@router.get("/contracts")
async def list_client_contracts(client_user = Depends(get_client_user), db = Depends(_get_db)):
    """List basic info for all contracts assigned to the user"""
    contract_ids = client_user.get("contract_ids", [])
    if not contract_ids:
        return {"success": True, "contracts": []}
        
    contracts = await db.revenue_workflow_contracts.find({
        "contract_id": {"$in": contract_ids},
        "org_id": client_user["org_id"]
    }).sort("created_at", -1).to_list(100)
    
    formatted = []
    for c in contracts:
        formatted.append({
            "contract_id": c.get("contract_id"),
            "lead_id": c.get("lead_id"),
            "status": c.get("contract_status"),
            "version": c.get("version", "v1"),
            "created_at": c.get("created_at"),
            "organization_name": c.get("party_name", "Unknown")
        })
    return {"success": True, "contracts": formatted}


@router.get("/contracts/{contract_id}")
async def get_client_contract(contract_id: str, client_user = Depends(get_client_user), db = Depends(_get_db)):
    """Get rich layout data for a specific contract."""
    contract_ids = client_user.get("contract_ids", [])
    if contract_id not in contract_ids:
        raise HTTPException(status_code=403, detail="Unassigned contract access attempt.")
        
    contract = await db.revenue_workflow_contracts.find_one({
        "contract_id": contract_id, 
        "org_id": client_user["org_id"]
    })
    
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found in this organization")
        
    onboarding = await db.revenue_workflow_onboarding.find_one({"contract_id": contract_id})
    lead = await db.revenue_workflow_leads.find_one({"lead_id": contract.get("lead_id")})
    
    safe_contract = {
        "contract_id": contract.get("contract_id"),
        "party_name": contract.get("party_name"),
        "payment_terms": contract.get("payment_terms"),
        "total_value": contract.get("total_value"),
    }
    
    safe_onboarding = {}
    if onboarding:
        safe_onboarding = {k:v for k,v in onboarding.items() if k != "_id"}
        
    docs = safe_onboarding.get("documents", {})

    onboarding_status = {
        "company_info": bool(safe_onboarding.get("legal_name") and safe_onboarding.get("address")),
        "contacts": bool(safe_onboarding.get("billing_contact")),
        "tax_info": bool(safe_onboarding.get("gst")),
        "documents": bool(docs.get("gst_certificate") and docs.get("pan_card"))
    }
    
    return {
        "success": True,
        "contract": safe_contract,
        "onboarding": safe_onboarding,
        "status": contract.get("contract_status"),
        "version": contract.get("version", "v1"),
        "signed_at": contract.get("signed_at"),
        "onboarding_status": onboarding_status,
        "lead_data": {
             "contact_name": lead.get("contact_name") if lead else None,
             "company_name": lead.get("company_name") if lead else None
        }
    }


@router.patch("/onboarding/{contract_id}")
async def patch_onboarding(contract_id: str, payload: OnboardingPayload, request: Request, background_tasks: BackgroundTasks, client_user = Depends(get_client_user), db = Depends(_get_db)):
    """Auto-save patch endpoint for granular onboarding updates"""
    contract_ids = client_user.get("contract_ids", [])
    if contract_id not in contract_ids:
        raise HTTPException(status_code=403, detail="Unassigned contract access attempt.")
        
    contract = await db.revenue_workflow_contracts.find_one({"contract_id": contract_id, "org_id": client_user["org_id"]})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
        
    if contract.get("contract_status") == "SIGNED":
        raise HTTPException(status_code=400, detail="Cannot modify signed contracts.")
        
    now_iso = datetime.now(timezone.utc).isoformat()
    ext_data = await db.revenue_workflow_onboarding.find_one({"contract_id": contract_id})
    payload_dict = payload.dict(exclude_none=True)
    
    # Check current completion state (before update)
    def check_completion(data_dict):
        if not data_dict: return False
        docs = data_dict.get("documents", {})
        return bool(
            data_dict.get("legal_name") and 
            data_dict.get("address") and 
            data_dict.get("gst") and 
            data_dict.get("billing_contact") and
            docs.get("gst_certificate") and 
            docs.get("pan_card")
        )

    was_complete = check_completion(ext_data) if ext_data else False

    if not ext_data:
        merged = payload_dict
        merged["contract_id"] = contract_id
        merged["lead_id"] = contract.get("lead_id")
        merged["org_id"] = client_user["org_id"]
        merged["created_at"] = now_iso
        merged["updated_at"] = now_iso
        await db.revenue_workflow_onboarding.insert_one(merged)
        # Log ONBOARDING_STARTED for first-time creation
        await log_audit_event(db, EVENT_TYPES["ONBOARDING_STARTED"], contract_id, client_user["user_id"], client_user["org_id"], request)
    else:
        # Atomic set for partial patching. Handle nested `documents` dictionary properly
        update_fields = {"updated_at": now_iso}
        for k, v in payload_dict.items():
            if k == "documents":
                for doc_k, doc_v in v.items():
                    update_fields[f"documents.{doc_k}"] = doc_v
            else:
                update_fields[k] = v
                
        await db.revenue_workflow_onboarding.update_one(
            {"contract_id": contract_id},
            {"$set": update_fields}
        )
    
    # Check NEW completion state
    new_data = await db.revenue_workflow_onboarding.find_one({"contract_id": contract_id})
    is_complete = check_completion(new_data)
    
    # Trigger "Onboarding Completed" only ONCE
    if is_complete and not was_complete and not new_data.get("onboarding_completed_at"):
        await db.revenue_workflow_onboarding.update_one(
            {"contract_id": contract_id},
            {"$set": {"onboarding_completed_at": now_iso}}
        )
        # Async background notification
        background_tasks.add_task(notify_onboarding_completed, contract_id, client_user, db)
        # Log ONBOARDING_COMPLETED audit
        await log_audit_event(db, EVENT_TYPES["ONBOARDING_COMPLETED"], contract_id, client_user["user_id"], client_user["org_id"], request)

    # Note: We omit noisy "ONBOARDING_UPDATED" audits here to maintain a clean timeline
        
    return {"success": True, "message": "Saved"}


@router.post("/upload")
async def upload_client_document(request: Request, file: UploadFile = File(...), client_user = Depends(get_client_user), db = Depends(_get_db)):
    """Generic File upload storing locally returning static path."""
    allowed_types = ["application/pdf", "image/png", "image/jpeg"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only PDF, PNG, and JPG files are allowed.")
        
    # Read to check size constraints (10MB limit)
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit.")
        
    ext = file.filename.split('.')[-1].lower() if '.' in file.filename else ''
    new_filename = f"{uuid.uuid4().hex}.{ext}"
    
    # Path inside backend context
    upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'innovatebook-backend', 'uploads', 'client_documents'))
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, new_filename)
    with open(file_path, "wb") as f:
        f.write(contents)
        
    # Audit log
    await log_audit_event(db, EVENT_TYPES["DOCUMENT_UPLOADED"], None, client_user["user_id"], client_user["org_id"], request, {"filename": new_filename})
        
    return {"success": True, "file_url": f"/uploads/client_documents/{new_filename}"}


@router.post("/sign/{contract_id}")
async def authenticate_and_sign(contract_id: str, payload: SignPayload, request: Request, background_tasks: BackgroundTasks, client_user = Depends(get_client_user), db = Depends(_get_db)):
    """Sign the contract with JWT auth enforcing lockout."""
    contract_ids = client_user.get("contract_ids", [])
    if contract_id not in contract_ids:
        raise HTTPException(status_code=403, detail="Unassigned contract access attempt.")
        
    contract = await db.revenue_workflow_contracts.find_one({"contract_id": contract_id, "org_id": client_user["org_id"]})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
        
    if contract.get("contract_status") == "SIGNED":
        raise HTTPException(status_code=400, detail="Already signed")
    if contract.get("contract_status") == "EXPIRED":
        raise HTTPException(status_code=403, detail="Contract link has expired. Please contact the sender for a new link.")
        
    now_iso = datetime.now(timezone.utc).isoformat()
    client_ip = request.client.host if request.client else "unknown"
    
    await db.revenue_workflow_contracts.update_one(
        {"contract_id": contract_id},
        {"$set": {
            "contract_status": "SIGNED",
            "contract_stage": "Sign", 
            "signed_by": payload.client_name,
            "signed_email": payload.client_email,
            "client_ip": client_ip,
            "signed_at": payload.timestamp,
            "updated_at": now_iso
        }}
    )
    
    await db.revenue_workflow_leads.update_one(
        {"lead_id": contract.get("lead_id")},
        {"$set": {
            "main_stage": "handoff",
            "stage": "handoff",
            "updated_at": now_iso
        }}
    )
    
    # Trigger Background Notifications
    background_tasks.add_task(notify_contract_signed, contract_id, payload.client_name, payload.client_email, payload.timestamp, db)
    
    # Log CONTRACT_SIGNED Audit
    await log_audit_event(db, EVENT_TYPES["CONTRACT_SIGNED"], contract_id, client_user["user_id"], client_user["org_id"], request, {
        "client_name": payload.client_name,
        "signed_at_client_ts": payload.timestamp
    })

    return {"success": True, "message": "Successfully Signed"}

# ==========================
# (DEPRECATED) LEGACY APIs
# ==========================

@router.put("/{token}/onboarding")
async def save_onboarding(token: str, payload: OnboardingPayload, request: Request, background_tasks: BackgroundTasks, client_user = Depends(get_client_user), db = Depends(_get_db)):
    """Auto-save point for client portal data"""
    token_doc = await _validate_token(token, db)
    contract_id = token_doc["contract_id"]
    lead_id = token_doc["lead_id"]
    org_id = token_doc["org_id"]
    
    if client_user["org_id"] != org_id or contract_id not in client_user.get("contract_ids", []):
        raise HTTPException(status_code=403, detail="Not authorized to edit this contract")
    
    # Ensure contract isn't already signed
    contract = await db.revenue_workflow_contracts.find_one({"contract_id": contract_id})
    if contract and contract.get("contract_status") == "SIGNED":
        raise HTTPException(status_code=400, detail="Cannot modify: contract is already signed.")
    
    now_iso = datetime.now(timezone.utc).isoformat()
    ext_data = await db.revenue_workflow_onboarding.find_one({"contract_id": contract_id})
    merged = OnboardingService.merge_data(ext_data, payload.dict(exclude_none=True))
    
    # Check current completion state (before update)
    def check_completion(data_dict):
        if not data_dict: return False
        docs = data_dict.get("documents", {})
        return bool(
            data_dict.get("legal_name") and 
            data_dict.get("address") and 
            data_dict.get("gst") and 
            data_dict.get("billing_contact") and
            docs.get("gst_certificate") and 
            docs.get("pan_card")
        )

    was_complete = check_completion(ext_data) if ext_data else False

    if not ext_data:
        merged["contract_id"] = contract_id
        merged["lead_id"] = lead_id
        merged["org_id"] = org_id
        merged["created_at"] = now_iso
        await db.revenue_workflow_onboarding.insert_one(merged)
    else:
        await db.revenue_workflow_onboarding.update_one(
            {"contract_id": contract_id},
            {"$set": merged}
        )
        
    # Check NEW completion state
    new_data = await db.revenue_workflow_onboarding.find_one({"contract_id": contract_id})
    is_complete = check_completion(new_data)
    
    # Trigger "Onboarding Completed" only ONCE
    if is_complete and not was_complete and not new_data.get("onboarding_completed_at"):
        await db.revenue_workflow_onboarding.update_one(
            {"contract_id": contract_id},
            {"$set": {"onboarding_completed_at": now_iso}}
        )
        # Async background notification
        background_tasks.add_task(notify_onboarding_completed, contract_id, client_user, db)

    return {"success": True, "message": "Onboarding details saved"}



@router.post("/{token}/sign")
async def sign_contract(token: str, payload: SignPayload, request: Request, background_tasks: BackgroundTasks, client_user = Depends(get_client_user), db = Depends(_get_db)):
    """Signs the contract with legal-grade evidence and locking"""
    token_doc = await _validate_token(token, db)
    contract_id = token_doc["contract_id"]
    lead_id = token_doc["lead_id"]
    org_id = token_doc["org_id"]
    
    if client_user["org_id"] != org_id or contract_id not in client_user.get("contract_ids", []):
        raise HTTPException(status_code=403, detail="Not authorized to sign this contract")
    
    contract = await db.revenue_workflow_contracts.find_one({"contract_id": contract_id})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
        
    # 1. RE-SIGN PROTECTION
    if contract.get("contract_status") == "SIGNED":
        return {"success": True, "message": "Agreement already fully executed"}
        
    # 2. VALIDATE READINESS (Onboarding + Docs)
    onboarding = await db.revenue_workflow_onboarding.find_one({"contract_id": contract_id})
    if not onboarding or not onboarding.get("onboarding_completed_at"):
        # Granular check if the completed_at flag is missing
        docs = onboarding.get("documents", {}) if onboarding else {}
        is_ready = onboarding and all([
            onboarding.get("legal_name"), 
            onboarding.get("address"), 
            onboarding.get("gst"),
            docs.get("gst_certificate"),
            docs.get("pan_card")
        ])
        if not is_ready:
            raise HTTPException(status_code=400, detail="Onboarding must be completed and documents uploaded before signing.")

    # 3. CANONICAL HASHING (Non-Repudiation)
    # We hash the agreement-specific terms and identifiers to create a unique fingerprint
    canonical_data = {
        "contract_id": contract_id,
        "version": contract.get("version", "v1"),
        "terms": contract.get("contract_data", {}), # Full commercial terms
        "amount": contract.get("total_value", 0),
        "client_name": payload.client_name,
        "client_email": payload.client_email
    }
    # Deterministic serialization
    serialized = json.dumps(canonical_data, sort_keys=True)
    contract_hash = hashlib.sha256(serialized.encode()).hexdigest()

    now_iso = datetime.now(timezone.utc).isoformat()
    
    # 4. ROBUST EVIDENCE CAPTURE
    # Capture IP supporting proxies/load balancers
    x_forwarded = request.headers.get("x-forwarded-for")
    ip_address = x_forwarded.split(",")[0] if x_forwarded else (request.client.host if request.client else "unknown")
    user_agent = request.headers.get("user-agent", "unknown")

    # 5. STRUCTURED ACCEPTANCE METADATA
    acceptance_metadata = {
        "signer_name": payload.client_name,
        "signer_email": payload.client_email,
        "signed_at": now_iso,
        "ip_address": ip_address,
        "user_agent": user_agent,
        "contract_hash": contract_hash,
        "contract_version": contract.get("version", "v1")
    }

    # 6. LOCKED SNAPSHOT
    # This prevents the "official" record from changing if internal terms are edited late
    signed_snapshot = {
        "contract_data": contract.get("contract_data"),
        "total_value": contract.get("total_value"),
        "hash": contract_hash,
        "timestamp": now_iso
    }

    # 7. MULTI-COLLECTION UPDATE
    # Update Contract with signature and lock
    await db.revenue_workflow_contracts.update_one(
        {"contract_id": contract_id},
        {"$set": {
            "contract_status": "SIGNED",
            "contract_stage": "Sign",
            "acceptance_metadata": acceptance_metadata,
            "signed_snapshot": signed_snapshot,
            "signed_at": now_iso,
            "updated_at": now_iso
        }}
    )
    
    # Update Lead Stage (Auto-Handoff)
    await db.revenue_workflow_leads.update_one(
        {"lead_id": lead_id},
        {"$set": {
            "main_stage": "handoff",
            "stage": "handoff",
            "updated_at": now_iso
        }}
    )

    # Invalidate Token
    await db.revenue_portal_tokens.update_one(
        {"token_hash": token_doc["token_hash"]},
        {"$set": {"status": "used"}}
    )

    # 8. ENRICHED AUDIT LOGGING
    await log_audit_event(db, EVENT_TYPES["CONTRACT_SIGNED"], contract_id, client_user["user_id"], client_user["org_id"], request, {
        "signer": payload.client_name,
        "hash": contract_hash,
        "ip": ip_address
    })

    # Trigger Background Notifications
    background_tasks.add_task(notify_contract_signed, contract_id, payload.client_name, payload.client_email, now_iso, db)
    
    return {"success": True, "message": "Contract signed with digital signature capture"}

# ==========================
# AUDIT RETRIEVAL API
# ==========================

@router.get("/audit/{contract_id}")
async def get_contract_audit_timeline(contract_id: str, client_user = Depends(get_client_user), db = Depends(_get_db)):
    """Ordered timeline of events for a specific contract."""
    contract_ids = client_user.get("contract_ids", [])
    if contract_id not in contract_ids:
        raise HTTPException(status_code=403, detail="Unassigned contract access attempt.")
        
    audits = await db.revenue_workflow_audits.find({"contract_id": contract_id}).sort("timestamp", 1).to_list(100)
    
    # Format for UI display
    formatted = []
    for a in audits:
        formatted.append({
            "event": a.get("event_type"),
            "timestamp": a.get("timestamp"),
            "metadata": a.get("metadata", {}),
            "source": a.get("metadata", {}).get("source", "system")
        })
    return {"success": True, "timeline": formatted}

@router.get("/internal/audit/{contract_id}")
async def get_internal_contract_audit(contract_id: str, db = Depends(_get_db)):
    """
    Standard retrieval for helpdesk/ops users. 
    NOTE: In production, this would be guarded by different RBAC dependencies.
    """
    audits = await db.revenue_workflow_audits.find({"contract_id": contract_id}).sort("timestamp", -1).to_list(100)
    return {"success": True, "audits": audits}


