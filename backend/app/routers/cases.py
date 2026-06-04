from fastapi import APIRouter, Depends, HTTPException, Body, status
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Case, CaseActivityLog, IntelligenceEntity, case_entities, User
from app.schemas.schemas import CaseResponse, CaseCreate, CaseActivityLogResponse
from app.core.security import get_current_user, RoleChecker
import uuid
from datetime import datetime

router = APIRouter(prefix="/cases", tags=["Investigation Workspace"])

# Helper function to generate case activity logs
def log_activity(db: Session, case_id: uuid.UUID, activity_type: str, description: str, user: str):
    log_entry = CaseActivityLog(
        case_id=case_id,
        activity_type=activity_type,
        description=description,
        performed_by=user
    )
    db.add(log_entry)
    db.commit()

@router.get("", response_model=List[CaseResponse])
def get_cases(
    priority: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all cases from the database, filtered optionally by priority or status."""
    query = db.query(Case)
    if priority:
        query = query.filter(Case.priority == priority)
    if status_filter:
        query = query.filter(Case.status == status_filter)
    return query.order_by(Case.created_at.desc()).all()

@router.get("/{case_id}", response_model=CaseResponse)
def get_case(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve details of a specific case by UUID or Case ID String."""
    query = db.query(Case)
    try:
        case_uuid = uuid.UUID(case_id)
        case = query.filter(Case.id == case_uuid).first()
    except ValueError:
        case = query.filter(Case.case_id_str == case_id).first()
        
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case

@router.post("", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
def create_case(
    case_in: CaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new investigation case, generating the case reference ID automatically."""
    # Ensure current user is Investigator or Admin
    if current_user.role not in ["Admin", "Investigator"]:
        raise HTTPException(status_code=403, detail="Only Investigators can initiate new case files.")
        
    # Auto-generate Case ID string: TL-YYYY-XXXX
    current_year = datetime.utcnow().year
    case_count = db.query(Case).filter(Case.case_id_str.like(f"TL-{current_year}-%")).count()
    case_id_str = f"TL-{current_year}-{case_count + 1:04d}"
    
    new_case = Case(
        case_id_str=case_id_str,
        investigator=case_in.investigator,
        priority=case_in.priority,
        status=case_in.status,
        summary=case_in.summary,
        notes=case_in.notes or ""
    )
    
    db.add(new_case)
    db.commit()
    db.refresh(new_case)
    
    # Log the creation action in audit trail
    log_activity(
        db, 
        new_case.id, 
        "Case Created", 
        f"Case file initiated by {current_user.username}. Auto-assigned ID: {case_id_str}.", 
        current_user.username
    )
    
    return new_case

@router.put("/{case_id}", response_model=CaseResponse)
def update_case(
    case_id: str,
    case_in: CaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update details or notes of a case."""
    query = db.query(Case)
    try:
        case_uuid = uuid.UUID(case_id)
        case = query.filter(Case.id == case_uuid).first()
    except ValueError:
        case = query.filter(Case.case_id_str == case_id).first()
        
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    # Check what fields changed to log appropriate messages
    changes = []
    if case.status != case_in.status:
        changes.append(f"status from '{case.status}' to '{case_in.status}'")
    if case.priority != case_in.priority:
        changes.append(f"priority from '{case.priority}' to '{case_in.priority}'")
    if case.investigator != case_in.investigator:
        changes.append(f"investigator from '{case.investigator}' to '{case_in.investigator}'")
        
    case.investigator = case_in.investigator
    case.priority = case_in.priority
    case.status = case_in.status
    case.summary = case_in.summary
    case.notes = case_in.notes
    
    db.commit()
    db.refresh(case)
    
    if changes:
        log_activity(
            db, 
            case.id, 
            "Case Updated", 
            f"Updated {', '.join(changes)} by {current_user.username}.", 
            current_user.username
        )
    else:
        log_activity(
            db, 
            case.id, 
            "Case Updated", 
            f"Dossier details modified by {current_user.username}.", 
            current_user.username
        )
        
    return case

@router.post("/{case_id}/link", response_model=Dict[str, Any])
def link_entity_to_case(
    case_id: str,
    entity_id: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Link an intelligence entity to an investigation case."""
    # Find case
    query = db.query(Case)
    try:
        case_uuid = uuid.UUID(case_id)
        case = query.filter(Case.id == case_uuid).first()
    except ValueError:
        case = query.filter(Case.case_id_str == case_id).first()
        
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    # Find entity
    entity = db.query(IntelligenceEntity).filter(IntelligenceEntity.id == uuid.UUID(entity_id)).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Intelligence entity not found")
        
    # Check if already linked
    is_linked = db.query(case_entities).filter_by(case_id=case.id, entity_id=entity.id).first()
    if is_linked:
        return {"success": True, "message": "Entity already linked to this case."}
        
    # Create relationship link
    db.execute(case_entities.insert().values(case_id=case.id, entity_id=entity.id))
    db.commit()
    
    # Log activity
    log_activity(
        db, 
        case.id, 
        "Entity Linked", 
        f"Linked intelligence entity '{entity.value}' ({entity.type}) to case file.", 
        current_user.username
    )
    
    return {
        "success": True,
        "message": f"Successfully linked {entity.type} ({entity.value}) to case {case.case_id_str}"
    }

@router.post("/{case_id}/unlink", response_model=Dict[str, Any])
def unlink_entity_from_case(
    case_id: str,
    entity_id: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove link between an intelligence entity and an investigation case."""
    query = db.query(Case)
    try:
        case_uuid = uuid.UUID(case_id)
        case = query.filter(Case.id == case_uuid).first()
    except ValueError:
        case = query.filter(Case.case_id_str == case_id).first()
        
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    entity = db.query(IntelligenceEntity).filter(IntelligenceEntity.id == uuid.UUID(entity_id)).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
        
    db.execute(case_entities.delete().where(case_entities.c.case_id == case.id).where(case_entities.c.entity_id == entity.id))
    db.commit()
    
    log_activity(
        db, 
        case.id, 
        "Entity Unlinked", 
        f"Removed link to intelligence entity '{entity.value}' ({entity.type}).", 
        current_user.username
    )
    
    return {"success": True, "message": "Successfully unlinked entity."}

@router.get("/{case_id}/activity", response_model=List[CaseActivityLogResponse])
def get_case_activity(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve the audit log and activity history for a specific case."""
    query = db.query(Case)
    try:
        case_uuid = uuid.UUID(case_id)
        case = query.filter(Case.id == case_uuid).first()
    except ValueError:
        case = query.filter(Case.case_id_str == case_id).first()
        
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    return db.query(CaseActivityLog).filter(CaseActivityLog.case_id == case.id).order_by(CaseActivityLog.timestamp.desc()).all()
