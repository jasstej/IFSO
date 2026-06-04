import os
import uuid
import hashlib
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from typing import List, Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Case, Evidence, EvidenceChainOfCustody, User
from app.schemas.schemas import EvidenceResponse, EvidenceChainOfCustodyResponse
from app.core.config import settings
from app.core.security import get_current_user
from app.routers.cases import log_activity

router = APIRouter(prefix="/evidence", tags=["Evidence Management"])

# Ensure uploads directory exists
UPLOAD_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), settings.UPLOAD_DIR)
os.makedirs(UPLOAD_PATH, exist_ok=True)

@router.post("/upload", response_model=EvidenceResponse, status_code=status.HTTP_201_CREATED)
async def upload_evidence(
    case_id: str = Form(...),
    description: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Uploads an evidence file (logs, screenshots, malware samples).
    Computes SHA256 hash in chunks to prevent memory overhead.
    Logs upload in the case audit log and initializes the Chain of Custody record.
    """
    # 1. Verify case exists
    try:
        case_uuid = uuid.UUID(case_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Case ID format.")
        
    case = db.query(Case).filter(Case.id == case_uuid).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")

    # 2. Check file size
    # We read file in chunks and stream write
    sha256 = hashlib.sha256()
    
    # Generate unique filename on disk to avoid collisions and path traversal
    file_extension = os.path.splitext(file.filename)[1]
    safe_filename = f"{uuid.uuid4()}{file_extension}"
    target_filepath = os.path.join(UPLOAD_PATH, safe_filename)
    
    total_size = 0
    try:
        with open(target_filepath, "wb") as buffer:
            while chunk := await file.read(8192):
                total_size += len(chunk)
                if total_size > settings.MAX_UPLOAD_SIZE:
                    # Clean up file
                    buffer.close()
                    os.remove(target_filepath)
                    raise HTTPException(status_code=413, detail="File size exceeds the 10MB safety limit.")
                sha256.update(chunk)
                buffer.write(chunk)
    except Exception as e:
        if os.path.exists(target_filepath):
            os.remove(target_filepath)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"File save error: {str(e)}")

    sha256_hash = sha256.hexdigest()
    
    # 3. Parse tags
    parsed_tags = [t.strip() for t in tags.split(",")] if tags else []

    # 4. Save to Database
    db_evidence = Evidence(
        case_id=case.id,
        filename=file.filename,
        filepath=safe_filename,  # relative filename
        file_size=total_size,
        mime_type=file.content_type,
        sha256_hash=sha256_hash,
        tags=parsed_tags,
        description=description or "",
        uploaded_by=current_user.username
    )
    db.add(db_evidence)
    db.commit()
    db.refresh(db_evidence)

    # 5. Create first Chain of Custody record
    chain_entry = EvidenceChainOfCustody(
        evidence_id=db_evidence.id,
        action="Uploaded",
        custodian=current_user.username,
        location="ThreatLens Evidence Vault",
        notes=f"Initial secure upload of evidence file. SHA256 Hash verified: {sha256_hash}."
    )
    db.add(chain_entry)
    db.commit()
    
    # 6. Log activity in Case Timeline
    log_activity(
        db,
        case.id,
        "Evidence Uploaded",
        f"Uploaded evidence file '{file.filename}' (SHA256: {sha256_hash[:8]}...) by {current_user.username}.",
        current_user.username
    )

    # Refresh evidence to load relations
    db.refresh(db_evidence)
    return db_evidence

@router.get("/case/{case_id}", response_model=List[EvidenceResponse])
def list_case_evidence(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists all evidence files linked to a specific case."""
    try:
        case_uuid = uuid.UUID(case_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Case ID format.")
        
    return db.query(Evidence).filter(Evidence.case_id == case_uuid).all()

@router.post("/{evidence_id}/transfer", response_model=EvidenceChainOfCustodyResponse)
def transfer_evidence_custody(
    evidence_id: str,
    new_custodian: str = Form(...),
    location: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Records a change of custody for a forensic evidence sample (Chain of Custody)."""
    try:
        evidence_uuid = uuid.UUID(evidence_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Evidence ID format.")
        
    evidence = db.query(Evidence).filter(Evidence.id == evidence_uuid).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found.")
        
    # Create chain of custody record
    chain_entry = EvidenceChainOfCustody(
        evidence_id=evidence.id,
        action="Custody Transferred",
        custodian=new_custodian,
        location=location or "Transferred Location",
        notes=notes or f"Custody transferred from {current_user.username} to {new_custodian}."
    )
    db.add(chain_entry)
    db.commit()
    db.refresh(chain_entry)
    
    # Log case activity
    log_activity(
        db,
        evidence.case_id,
        "Custody Transferred",
        f"Forensic sample '{evidence.filename}' transferred to custodian '{new_custodian}'.",
        current_user.username
    )
    
    return chain_entry

@router.get("/{evidence_id}/download")
def download_evidence(
    evidence_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Downloads the evidence file securely.
    Sets 'X-Content-Type-Options: nosniff' header to mitigate client-side mime sniffing vulnerabilities.
    """
    try:
        evidence_uuid = uuid.UUID(evidence_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Evidence ID format.")
        
    evidence = db.query(Evidence).filter(Evidence.id == evidence_uuid).first()
    if not evidence:
        raise HTTPException(status_code=404, detail="Evidence not found.")
        
    full_filepath = os.path.join(UPLOAD_PATH, evidence.filepath)
    if not os.path.exists(full_filepath):
        raise HTTPException(status_code=404, detail="Evidence file missing on disk.")
        
    headers = {
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": f'attachment; filename="{evidence.filename}"'
    }
    
    return FileResponse(
        path=full_filepath,
        media_type=evidence.mime_type or "application/octet-stream",
        headers=headers
    )
