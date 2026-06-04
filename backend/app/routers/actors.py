from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import ThreatActor, User
from app.schemas.schemas import ThreatActorResponse, ThreatActorCreate, ThreatActorDetailsResponse
from app.core.security import get_current_user
import uuid

router = APIRouter(prefix="/actors", tags=["Threat Actors"])

@router.get("", response_model=List[ThreatActorResponse])
def list_threat_actors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns a list of all threat actors in the database."""
    return db.query(ThreatActor).order_by(ThreatActor.name).all()

@router.post("", response_model=ThreatActorResponse, status_code=status.HTTP_201_CREATED)
def create_threat_actor(
    actor_in: ThreatActorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Register a new threat actor profile (requires Admin/Investigator role)."""
    if current_user.role not in ["Admin", "Investigator"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions to register threat actors.")
        
    existing = db.query(ThreatActor).filter(ThreatActor.name == actor_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Threat actor name already exists.")
        
    actor = ThreatActor(
        name=actor_in.name,
        aliases=actor_in.aliases,
        country=actor_in.country,
        motivation=actor_in.motivation,
        threat_level=actor_in.threat_level,
        confidence_rating=actor_in.confidence_rating,
        description=actor_in.description
    )
    db.add(actor)
    db.commit()
    db.refresh(actor)
    return actor

@router.get("/{actor_id}/details", response_model=ThreatActorDetailsResponse)
def get_threat_actor_details(
    actor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns full details for a threat actor profile grouped by tabs:
    - Summary
    - Infrastructure (linked entities)
    - Malware
    - ATT&CK techniques
    - Timeline (campaign starts, activities)
    """
    query = db.query(ThreatActor)
    try:
        actor_uuid = uuid.UUID(actor_id)
        actor = query.filter(ThreatActor.id == actor_uuid).first()
    except ValueError:
        actor = query.filter(ThreatActor.name == actor_id).first()
        
    if not actor:
        raise HTTPException(status_code=404, detail="Threat Actor profile not found")

    # 1. Infrastructure (linked entities)
    infra_data = []
    for entity in actor.entities:
        infra_data.append({
            "type": entity.type,
            "value": entity.value,
            "status": "Active C2" if entity.risk_score >= 80 else "Suspicious",
            "ip_resolved": "N/A"
        })

    # 2. Malware
    malware_data = []
    for m in actor.malware:
        malware_data.append({
            "name": m.name,
            "type": m.type,
            "risk": m.risk_level,
            "first_seen": str(m.first_seen)
        })

    # 3. ATT&CK Techniques mapped via campaigns
    attack_data = []
    seen_techniques = set()
    for campaign in actor.campaigns:
        for tech in campaign.techniques:
            if tech.id not in seen_techniques:
                attack_data.append({
                    "tactic": tech.tactic,
                    "technique_id": tech.id,
                    "technique": tech.name
                })
                seen_techniques.add(tech.id)

    # 4. Timeline
    timeline_data = []
    for campaign in actor.campaigns:
        timeline_data.append({
            "date": str(campaign.start_date),
            "event": f"Campaign '{campaign.name}' launched targeting {', '.join(campaign.target_sector)} in {', '.join(campaign.region)}."
        })
    # Sort timeline by date descending
    timeline_data.sort(key=lambda x: x["date"], reverse=True)

    return ThreatActorDetailsResponse(
        name=actor.name,
        aliases=actor.aliases,
        country=actor.country,
        motivation=actor.motivation,
        threat_level=actor.threat_level,
        confidence_rating=actor.confidence_rating,
        summary=actor.description,
        infrastructure=infra_data,
        malware=malware_data,
        attack=attack_data,
        timeline=timeline_data
    )
