from fastapi import APIRouter, Depends, HTTPException, Query, status, Body
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import IntelligenceEntity, ThreatActor, Campaign, Evidence, actor_entities, campaign_entities, evidence_entities, User
from app.schemas.schemas import IntelligenceEntityResponse, IntelligenceEntityCreate, CorrelationGraphResponse
from app.services.neo4j_service import neo4j_service
from app.core.security import get_current_user
import uuid

router = APIRouter(prefix="/entities", tags=["Intelligence Entity Management"])

@router.get("", response_model=List[IntelligenceEntityResponse])
def search_entities(
    q: Optional[str] = Query(None, description="Search by value or description"),
    entity_type: Optional[str] = Query(None, alias="type", description="Filter by type (IP Address, etc.)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List and search threat intelligence entities."""
    query = db.query(IntelligenceEntity)
    if q:
        query = query.filter(
            (IntelligenceEntity.value.ilike(f"%{q}%")) |
            (IntelligenceEntity.description.ilike(f"%{q}%"))
        )
    if entity_type:
        query = query.filter(IntelligenceEntity.type == entity_type)
        
    return query.order_by(IntelligenceEntity.created_at.desc()).all()

@router.post("", response_model=IntelligenceEntityResponse, status_code=status.HTTP_201_CREATED)
def create_entity(
    entity_in: IntelligenceEntityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Register a new threat indicator or intelligence entity in the repository."""
    # Check if entity already exists
    existing = db.query(IntelligenceEntity).filter(IntelligenceEntity.value == entity_in.value).first()
    if existing:
        return existing
        
    entity = IntelligenceEntity(
        value=entity_in.value,
        type=entity_in.type,
        risk_score=entity_in.risk_score,
        threat_level=entity_in.threat_level,
        description=entity_in.description,
        tags=entity_in.tags
    )
    db.add(entity)
    db.commit()
    db.refresh(entity)
    
    # Sync to Neo4j Graph
    neo4j_service.add_entity(entity.id, entity.value, entity.type, entity.risk_score)
    
    return entity

@router.get("/{entity_id}", response_model=IntelligenceEntityResponse)
def get_entity_details(
    entity_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve details for a specific intelligence entity."""
    try:
        entity_uuid = uuid.UUID(entity_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format.")
        
    entity = db.query(IntelligenceEntity).filter(IntelligenceEntity.id == entity_uuid).first()
    if not entity:
        raise HTTPException(status_code=404, detail="Intelligence entity not found.")
    return entity

@router.post("/{entity_id}/link-actor", response_model=Dict[str, Any])
def link_entity_to_actor(
    entity_id: str,
    actor_id: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Link an entity to a Threat Actor profile."""
    entity = db.query(IntelligenceEntity).filter(IntelligenceEntity.id == uuid.UUID(entity_id)).first()
    actor = db.query(ThreatActor).filter(ThreatActor.id == uuid.UUID(actor_id)).first()
    
    if not entity or not actor:
        raise HTTPException(status_code=404, detail="Entity or Threat Actor not found.")
        
    # Check link
    link = db.query(actor_entities).filter_by(threat_actor_id=actor.id, entity_id=entity.id).first()
    if not link:
        db.execute(actor_entities.insert().values(threat_actor_id=actor.id, entity_id=entity.id))
        db.commit()
        
    # Sync to Neo4j Graph
    neo4j_service.add_actor(actor.id, actor.name, actor.country, actor.motivation, actor.threat_level)
    neo4j_service.add_entity(entity.id, entity.value, entity.type, entity.risk_score)
    neo4j_service.link_entity_to_actor(actor.id, entity.id, "USES")
    
    return {"success": True, "message": f"Successfully linked entity to Actor {actor.name}."}

@router.post("/{entity_id}/link-campaign", response_model=Dict[str, Any])
def link_entity_to_campaign(
    entity_id: str,
    campaign_id: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Link an entity to a Campaign profile."""
    entity = db.query(IntelligenceEntity).filter(IntelligenceEntity.id == uuid.UUID(entity_id)).first()
    campaign = db.query(Campaign).filter(Campaign.id == uuid.UUID(campaign_id)).first()
    
    if not entity or not campaign:
        raise HTTPException(status_code=404, detail="Entity or Campaign not found.")
        
    link = db.query(campaign_entities).filter_by(campaign_id=campaign.id, entity_id=entity.id).first()
    if not link:
        db.execute(campaign_entities.insert().values(campaign_id=campaign.id, entity_id=entity.id))
        db.commit()
        
    # Sync to Neo4j
    neo4j_service.add_campaign(campaign.id, campaign.name, campaign.status, campaign.threat_actor_id)
    neo4j_service.add_entity(entity.id, entity.value, entity.type, entity.risk_score)
    if campaign.threat_actor_id:
        neo4j_service.link_entity_to_actor(campaign.threat_actor_id, entity.id, "EXPLOITS_WITH")
        
    return {"success": True, "message": f"Successfully linked entity to Campaign {campaign.name}."}

@router.post("/{entity_id}/link-evidence", response_model=Dict[str, Any])
def link_entity_to_evidence(
    entity_id: str,
    evidence_id: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Link an entity to an evidence file."""
    entity = db.query(IntelligenceEntity).filter(IntelligenceEntity.id == uuid.UUID(entity_id)).first()
    evidence = db.query(Evidence).filter(Evidence.id == uuid.UUID(evidence_id)).first()
    
    if not entity or not evidence:
        raise HTTPException(status_code=404, detail="Entity or Evidence not found.")
        
    link = db.query(evidence_entities).filter_by(evidence_id=evidence.id, entity_id=entity.id).first()
    if not link:
        db.execute(evidence_entities.insert().values(evidence_id=evidence.id, entity_id=entity.id))
        db.commit()
        
    return {"success": True, "message": f"Successfully linked entity to evidence file {evidence.filename}."}

@router.get("/get-graph", response_model=CorrelationGraphResponse)
def get_graph(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns the full correlation graph of threat intelligence nodes and edges."""
    return neo4j_service.get_correlation_graph(db)
