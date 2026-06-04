from fastapi import APIRouter, Depends
from typing import Dict, Any, List
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import ThreatActor, Campaign, MalwareFamily, IntelligenceEntity, CaseActivityLog, User
from app.core.security import get_current_user
import random

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=Dict[str, Any])
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns high-level statistics for the ThreatLens dashboard:
    - Total Threat Actors
    - Active Campaigns
    - Collected Entities
    - Malware Families
    - Risk Alerts (Critical/High counts)
    """
    actors_count = db.query(ThreatActor).count()
    campaigns_count = db.query(Campaign).filter(Campaign.status == "Active").count()
    entities_count = db.query(IntelligenceEntity).count()
    malware_count = db.query(MalwareFamily).count()
    
    # Risk alert breakdown
    critical = db.query(IntelligenceEntity).filter(IntelligenceEntity.threat_level == "Critical").count()
    high = db.query(IntelligenceEntity).filter(IntelligenceEntity.threat_level == "High").count()
    medium = db.query(IntelligenceEntity).filter(IntelligenceEntity.threat_level == "Medium").count()
    low = db.query(IntelligenceEntity).filter(IntelligenceEntity.threat_level == "Low").count()
    
    return {
        "total_threat_actors": actors_count,
        "active_campaigns": campaigns_count,
        "collected_iocs": entities_count,
        "malware_families": malware_count,
        "risk_alerts": {
            "critical": critical,
            "high": high,
            "medium": medium,
            "low": low
        }
    }

@router.get("/timeline", response_model=List[Dict[str, Any]])
def get_activity_timeline(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Returns the most recent global cyber intelligence timeline activities."""
    logs = db.query(CaseActivityLog).order_by(CaseActivityLog.timestamp.desc()).limit(10).all()
    
    timeline = []
    for idx, log in enumerate(logs):
        # Map activity to severity
        severity = "High" if "Evidence" in log.activity_type else "Critical" if "Created" in log.activity_type else "Medium"
        timeline.append({
            "id": idx + 1,
            "event_type": log.activity_type,
            "title": log.description[:50] + "..." if len(log.description) > 50 else log.description,
            "actor": log.performed_by,
            "timestamp": log.timestamp.isoformat() + "Z",
            "severity": severity,
            "details": log.description
        })
        
    # If no logs, return default mock timeline
    if not timeline:
        return [
            {
                "id": 1,
                "event_type": "System Initialized",
                "title": "ThreatLens Version 2 Database Online",
                "actor": "System Admin",
                "timestamp": "2026-06-04T00:00:00Z",
                "severity": "Low",
                "details": "Relational PostgreSQL database initialized and operational."
            }
        ]
        
    return timeline

@router.get("/threat-map", response_model=List[Dict[str, Any]])
def get_threat_map_locations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns coordinates for threat activity, C2 nodes, and target locations
    dynamically mapped from the active IP Address / Domain entities.
    """
    # Fetch active IPs/domains
    entities = db.query(IntelligenceEntity).filter(
        IntelligenceEntity.type.in_(["IP Address", "Domain"])
    ).limit(10).all()
    
    locations = []
    
    # Static geo reference points to distribute mock coordinates deterministically
    geo_centers = [
        {"lat": 37.5665, "lng": 126.9780, "label": "Seoul C2"},
        {"lat": 55.7558, "lng": 37.6173, "label": "Moscow Origin"},
        {"lat": 40.7128, "lng": -74.0060, "label": "New York Gateway"},
        {"lat": 52.5200, "lng": 13.4050, "label": "Berlin Node"},
        {"lat": 35.6762, "lng": 139.6503, "label": "Tokyo Host"},
        {"lat": -33.8688, "lng": 151.2093, "label": "Sydney Proxy"},
        {"lat": 1.3521, "lng": 103.8198, "label": "Singapore Redirector"}
    ]
    
    for idx, entity in enumerate(entities):
        center = geo_centers[idx % len(geo_centers)]
        # Add slight jitter
        jitter_lat = (idx * 0.13) % 1.5 - 0.75
        jitter_lng = (idx * 0.27) % 1.5 - 0.75
        
        locations.append({
            "id": idx + 1,
            "type": "C2 Infrastructure" if entity.risk_score >= 80 else "Redirector Node",
            "title": f"Infrastructure node: {entity.value}",
            "actor": "Correlated Threat Group",
            "lat": center["lat"] + jitter_lat,
            "lng": center["lng"] + jitter_lng,
            "severity": entity.threat_level,
            "details": entity.description or "Active network C2 node."
        })
        
    if not locations:
        # Fallback default map locations
        return [
            {
                "id": 1,
                "type": "C2 Infrastructure",
                "title": "Active C2 Node: 185.123.45.67",
                "actor": "APT28",
                "lat": 55.7558,
                "lng": 37.6173,
                "severity": "Critical",
                "details": "IP Address resolving to upgrade-microsoft-service.com C2."
            }
        ]
        
    return locations
