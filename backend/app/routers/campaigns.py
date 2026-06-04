from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Campaign, ThreatActor, User, MitreTechnique
from app.schemas.schemas import CampaignResponse, CampaignCreate
from app.core.security import get_current_user
import uuid

router = APIRouter(prefix="/campaigns", tags=["Campaign Tracking"])

@router.get("", response_model=List[CampaignResponse])
def get_campaigns(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns a list of all active or recorded campaigns."""
    return db.query(Campaign).order_by(Campaign.start_date.desc()).all()

@router.post("", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
def create_campaign(
    campaign_in: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Register a new active cyber operation campaign (requires Admin/Investigator)."""
    if current_user.role not in ["Admin", "Investigator"]:
        raise HTTPException(status_code=403, detail="Insufficient privileges to create campaigns.")
        
    existing = db.query(Campaign).filter(Campaign.name == campaign_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Campaign name already registered.")
        
    # Verify actor exists if provided
    if campaign_in.threat_actor_id:
        actor = db.query(ThreatActor).filter(ThreatActor.id == campaign_in.threat_actor_id).first()
        if not actor:
            raise HTTPException(status_code=404, detail="Threat Actor not found.")
            
    campaign = Campaign(
        name=campaign_in.name,
        start_date=campaign_in.start_date,
        status=campaign_in.status,
        threat_actor_id=campaign_in.threat_actor_id,
        target_sector=campaign_in.target_sector,
        region=campaign_in.region,
        summary=campaign_in.summary
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign

@router.get("/{campaign_id}/details", response_model=Dict[str, Any])
def get_campaign_details(
    campaign_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns extended details for a specific campaign:
    - Campaign Timeline
    - Sector Target Heatmap details
    - Linked IOC list
    """
    query = db.query(Campaign)
    try:
        camp_uuid = uuid.UUID(campaign_id)
        campaign = query.filter(Campaign.id == camp_uuid).first()
    except ValueError:
        campaign = query.filter(Campaign.name == campaign_id).first()
        
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # Get actor name
    actor_name = campaign.actor.name if campaign.actor else "Unknown"

    # Get linked entities (IOCs)
    iocs = []
    for entity in campaign.entities:
        iocs.append({
            "value": entity.value,
            "type": entity.type,
            "risk": entity.risk_score
        })

    # Compile heatmap sector data dynamically
    heatmap = []
    for sector in campaign.target_sector:
        heatmap.append({
            "sector": sector,
            "weight": 90 if sector in ["Government", "Defense", "Finance"] else 60
        })

    # Compile timeline
    timeline = [
        {
            "date": str(campaign.start_date),
            "event": f"Operation initialized targeting {', '.join(campaign.target_sector)} in {', '.join(campaign.region)}."
        }
    ]
    
    # Add events if any IOCs exist
    for idx, ioc in enumerate(iocs[:2]):
        timeline.insert(0, {
            "date": str(campaign.start_date),  # mock relative
            "event": f"Infrastructure node identified: {ioc['value']} ({ioc['type']})."
        })

    return {
        "name": campaign.name,
        "actor": actor_name,
        "timeline": timeline,
        "heatmap": heatmap,
        "iocs": iocs
    }

@router.get("/mitre-matrix", response_model=List[Dict[str, Any]])
def get_mitre_matrix(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns the MITRE ATT&CK technique matrix mapped to campaign usage."""
    techniques = db.query(MitreTechnique).all()
    matrix = []
    for tech in techniques:
        matrix.append({
            "tactic": tech.tactic,
            "technique_id": tech.id,
            "name": tech.name,
            "campaigns": [c.name for c in tech.campaigns]
        })
    return matrix
