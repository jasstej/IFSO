from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Case, CaseActivityLog, User
from app.schemas.schemas import CaseActivityLogResponse
from app.core.security import get_current_user
import uuid

router = APIRouter(prefix="/timeline", tags=["Timeline Log"])

@router.get("/case/{case_id}", response_model=List[CaseActivityLogResponse])
def get_case_timeline(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns an aggregated chronological list of events for a case file.
    Includes case creation, status/priority updates, analyst notes, and evidence uploads.
    """
    query = db.query(Case)
    try:
        case_uuid = uuid.UUID(case_id)
        case = query.filter(Case.id == case_uuid).first()
    except ValueError:
        case = query.filter(Case.case_id_str == case_id).first()
        
    if not case:
        raise HTTPException(status_code=404, detail="Case reference not found.")
        
    # Query logs
    return db.query(CaseActivityLog).filter(
        CaseActivityLog.case_id == case.id
    ).order_by(CaseActivityLog.timestamp.desc()).all()
