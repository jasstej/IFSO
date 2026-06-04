from fastapi import APIRouter, Depends
from typing import List
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.schemas import SharedCorrelation
from app.models.models import User
from app.services.correlation_service import correlation_service
from app.core.security import get_current_user

router = APIRouter(prefix="/correlations", tags=["Correlation Engine"])

@router.get("", response_model=List[SharedCorrelation])
def get_shared_infrastructure_correlations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Triggers the Correlation Engine to scan the database.
    Identifies shared infrastructure (overlapping domains, IPs, emails, crypto wallets, phone numbers) 
    across distinct cases, threat actors, and campaigns, generating confidence ratings.
    """
    return correlation_service.run_correlation_engine(db)
