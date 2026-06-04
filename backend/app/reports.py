import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Case, ThreatActor, Campaign, IntelligenceEntity, User
from app.services.pdf_generator import generate_threat_report_pdf
from app.core.security import get_current_user

router = APIRouter(prefix="/reports", tags=["Report Generation"])

@router.get("/export", response_class=StreamingResponse)
def export_case_report(
    case_id: str = Query(..., description="UUID or Reference code of the case"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates and returns a PDF intelligence report for a case.
    Headers are configured in compliance with backend file serving security guidelines:
    - Content-Disposition: attachment
    - X-Content-Type-Options: nosniff
    - Content-Type: application/pdf
    """
    # 1. Fetch case details
    query = db.query(Case)
    try:
        case_uuid = uuid.UUID(case_id)
        case = query.filter(Case.id == case_uuid).first()
    except ValueError:
        case = query.filter(Case.case_id_str == case_id).first()
        
    if not case:
        raise HTTPException(status_code=404, detail="Case reference not found")
        
    # 2. Gather linked entities (indicators)
    entities = case.entities
    iocs_data = []
    for entity in entities:
        iocs_data.append({
            "value": entity.value,
            "type": entity.type,
            "risk_score": entity.risk_score,
            "threat_level": entity.threat_level,
            "reputation": "Malicious" if entity.risk_score >= 80 else "Suspicious" if entity.risk_score >= 40 else "Clean"
        })
        
    # 3. Dynamic Correlation Traverse: Find associated Threat Actor
    correlated_actor = None
    for entity in entities:
        actor_link = db.query(ThreatActor).join(ThreatActor.entities).filter(IntelligenceEntity.id == entity.id).first()
        if actor_link:
            correlated_actor = actor_link
            break
            
    actor_data = {}
    if correlated_actor:
        actor_data = {
            "name": correlated_actor.name,
            "aliases": correlated_actor.aliases,
            "country": correlated_actor.country,
            "motivation": correlated_actor.motivation,
            "threat_level": correlated_actor.threat_level,
            "description": correlated_actor.description
        }
    else:
        # Fallback to check if actor was referenced in notes or summary
        actor_data = None
        
    # 4. Dynamic Correlation Traverse: Find associated Campaign
    correlated_campaign = None
    for entity in entities:
        camp_link = db.query(Campaign).join(Campaign.entities).filter(IntelligenceEntity.id == entity.id).first()
        if camp_link:
            correlated_campaign = camp_link
            break
            
    campaign_data = {}
    if correlated_campaign:
        campaign_data = {
            "name": correlated_campaign.name,
            "start_date": correlated_campaign.start_date,
            "status": correlated_campaign.status,
            "target_sector": correlated_campaign.target_sector,
            "region": correlated_campaign.region,
            "summary": correlated_campaign.summary
        }
    else:
        campaign_data = None

    # 5. Get Evidence Inventory
    evidence_list = []
    for ev in case.evidence:
        evidence_list.append({
            "filename": ev.filename,
            "file_size": ev.file_size,
            "sha256_hash": ev.sha256_hash,
            "uploaded_by": ev.uploaded_by,
            "uploaded_at": ev.uploaded_at
        })

    # 6. Get Activity Timeline
    timeline_logs = []
    for log in case.logs:
        timeline_logs.append({
            "timestamp": log.timestamp,
            "activity_type": log.activity_type,
            "description": log.description,
            "performed_by": log.performed_by
        })

    # 7. Compile risk metrics
    max_risk = max([e.risk_score for e in entities]) if entities else 50
    risk_level = "Critical" if max_risk >= 90 else "High" if max_risk >= 75 else "Medium" if max_risk >= 40 else "Low"

    report_data = {
        "case_id": case.case_id_str,
        "investigator": case.investigator,
        "priority": case.priority,
        "status": case.status,
        "summary": case.summary,
        "actor": actor_data,
        "campaign": campaign_data,
        "evidence": evidence_list,
        "iocs": iocs_data,
        "timeline": timeline_logs,
        "risk_assessment": {
            "overall_score": max_risk,
            "overall_level": risk_level,
            "rationale": f"Aggregated threat vectors map to dynamic risk scoring of {max_risk}/100. "
                         f"Case is active with {len(entities)} tracked indicator overlays."
        }
    }
    
    # 8. Generate PDF byte stream
    pdf_bytes = generate_threat_report_pdf(report_data)
    
    # 9. Return StreamingResponse with secure headers
    headers = {
        "Content-Disposition": f'attachment; filename="ThreatLens_Report_{case.case_id_str}.pdf"',
        "X-Content-Type-Options": "nosniff"
    }
    
    return StreamingResponse(
        pdf_bytes,
        media_type="application/pdf",
        headers=headers
    )
