from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import IntelligenceEntity, User
from app.schemas.schemas import IOCResponse, IOCCreate
from app.core.security import get_current_user
import uuid

router = APIRouter(prefix="/iocs", tags=["Indicators of Compromise"])

@router.get("", response_model=List[IOCResponse])
def get_iocs(
    q: Optional[str] = Query(None, description="Search term for IOC value"),
    ioc_type: Optional[str] = Query(None, description="Filter by type"),
    min_score: Optional[int] = Query(None, description="Filter by minimum risk score"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Search and filter Indicators of Compromise (IOCs) from the intelligence repository."""
    query = db.query(IntelligenceEntity)
    
    # Map old ioc_type names to new database type names if needed
    if ioc_type:
        if ioc_type.lower() == "ip address":
            query = query.filter(IntelligenceEntity.type == "IP Address")
        elif ioc_type.lower() == "cryptocurrency wallet":
            query = query.filter(IntelligenceEntity.type == "Cryptocurrency Wallet")
        else:
            query = query.filter(IntelligenceEntity.type.ilike(ioc_type))
            
    if q:
        query = query.filter(
            (IntelligenceEntity.value.ilike(f"%{q}%")) |
            (IntelligenceEntity.description.ilike(f"%{q}%"))
        )
    if min_score:
        query = query.filter(IntelligenceEntity.risk_score >= min_score)
        
    entities = query.order_by(IntelligenceEntity.created_at.desc()).all()
    
    # Convert IntelligenceEntity to IOCResponse
    iocs = []
    for e in entities:
        # Map DB type to schemas pattern (Domain, IP Address, URL, Email Address, SHA256 Hash, Cryptocurrency Wallet)
        type_mapped = e.type
        if e.type == "Email":
            type_mapped = "Email Address"
        elif e.type == "Hash" or e.type == "SHA256 Hash":
            type_mapped = "SHA256 Hash"
            
        # Ensure it matches Pydantic enum pattern in schemas.py
        if type_mapped not in ["Domain", "IP Address", "URL", "Email Address", "SHA256 Hash", "Cryptocurrency Wallet"]:
            # Fallback for old enums
            type_mapped = "Domain"

        iocs.append(IOCResponse(
            id=e.id,
            value=e.value,
            type=type_mapped,
            risk_score=e.risk_score,
            threat_level=e.threat_level,
            reputation="Malicious" if e.risk_score >= 80 else "Suspicious" if e.risk_score >= 40 else "Clean",
            description=e.description,
            tags=e.tags,
            created_at=e.created_at,
            updated_at=e.updated_at
        ))
    return iocs

@router.post("", response_model=IOCResponse, status_code=status.HTTP_201_CREATED)
def create_ioc(
    ioc: IOCCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Creates a new Indicator of Compromise in the database."""
    # Map old type enum pattern to DB type
    db_type = ioc.type
    if ioc.type == "Email Address":
        db_type = "Email"
    elif ioc.type == "SHA256 Hash":
        db_type = "SHA256 Hash"  # will map to valid check constraints
        
    # Check if value exists
    existing = db.query(IntelligenceEntity).filter(IntelligenceEntity.value == ioc.value).first()
    if existing:
        return IOCResponse(
            id=existing.id,
            value=existing.value,
            type=ioc.type,
            risk_score=existing.risk_score,
            threat_level=existing.threat_level,
            reputation=existing.threat_level,
            description=existing.description,
            tags=existing.tags,
            created_at=existing.created_at,
            updated_at=existing.updated_at
        )
        
    entity = IntelligenceEntity(
        value=ioc.value,
        type=db_type if db_type in [
            'IP Address', 'Domain', 'URL', 'Email', 'Phone Number', 
            'UPI ID', 'Cryptocurrency Wallet', 'Social Media Handle', 
            'Person of Interest', 'Organization', 'Device'
        ] else "Domain",
        risk_score=ioc.risk_score,
        threat_level=ioc.threat_level,
        description=ioc.description or "",
        tags=ioc.tags
    )
    db.add(entity)
    db.commit()
    db.refresh(entity)
    
    return IOCResponse(
        id=entity.id,
        value=entity.value,
        type=ioc.type,
        risk_score=entity.risk_score,
        threat_level=entity.threat_level,
        reputation="Malicious" if entity.risk_score >= 80 else "Suspicious",
        description=entity.description,
        tags=entity.tags,
        created_at=entity.created_at,
        updated_at=entity.updated_at
    )

@router.get("/{ioc_id}/relationships", response_model=Dict[str, Any])
def get_ioc_relationships(
    ioc_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns immediate relationships for an IOC to map graph nodes and edges."""
    try:
        ioc_uuid = uuid.UUID(ioc_id)
        entity = db.query(IntelligenceEntity).filter(IntelligenceEntity.id == ioc_uuid).first()
    except ValueError:
        entity = db.query(IntelligenceEntity).filter(IntelligenceEntity.value == ioc_id).first()
        
    if not entity:
        raise HTTPException(status_code=404, detail="Indicator not found.")
        
    # Compile nodes and edges dynamically
    nodes = [{"id": str(entity.id), "label": entity.value, "type": entity.type}]
    edges = []
    
    for actor in entity.actors:
        nodes.append({"id": f"actor-{actor.id}", "label": actor.name, "type": "Threat Actor"})
        edges.append({"source": f"actor-{actor.id}", "target": str(entity.id), "label": "USES"})
        
    for campaign in entity.campaigns:
        nodes.append({"id": f"campaign-{campaign.id}", "label": campaign.name, "type": "Campaign"})
        edges.append({"source": f"campaign-{campaign.id}", "target": str(entity.id), "label": "EXPLOITS_WITH"})
        
    return {
        "ioc_value": entity.value,
        "nodes": nodes,
        "edges": edges
    }
