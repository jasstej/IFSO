import csv
import json
import io
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Case, IntelligenceEntity, case_entities, User
from app.core.security import get_current_user
from app.routers.cases import log_activity
from app.services.neo4j_service import neo4j_service

router = APIRouter(prefix="/import", tags=["Data Import Ingestion"])

@router.post("/csv", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def import_csv_indicators(
    case_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ingests threat indicators from a CSV file.
    CSV Columns expected: value, type, risk_score, threat_level, description, tags
    Automatically creates entities and links them to the specified case dossier.
    """
    try:
        case_uuid = uuid.UUID(case_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Case UUID.")
        
    case = db.query(Case).filter(Case.id == case_uuid).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case file not found.")

    contents = await file.read()
    string_io = io.StringIO(contents.decode("utf-8"))
    reader = csv.DictReader(string_io)
    
    imported_count = 0
    skipped_count = 0
    
    for row in reader:
        value = row.get("value")
        type_str = row.get("type")
        
        if not value or not type_str:
            skipped_count += 1
            continue
            
        # Parse fields
        try:
            risk_score = int(row.get("risk_score", 50))
        except ValueError:
            risk_score = 50
            
        threat_level = row.get("threat_level", "Medium")
        if threat_level not in ["Low", "Medium", "High", "Critical"]:
            threat_level = "Medium"
            
        description = row.get("description", "")
        tags_str = row.get("tags", "")
        tags = [t.strip() for t in tags_str.split(",")] if tags_str else []
        
        # Check type
        valid_types = [
            'IP Address', 'Domain', 'URL', 'Email', 'Phone Number', 
            'UPI ID', 'Cryptocurrency Wallet', 'Social Media Handle', 
            'Person of Interest', 'Organization', 'Device'
        ]
        if type_str not in valid_types:
            # Map common variations
            if type_str.lower() in ["ip", "ip_address"]:
                type_str = "IP Address"
            elif type_str.lower() == "email address":
                type_str = "Email"
            else:
                skipped_count += 1
                continue
                
        # Get or create entity
        entity = db.query(IntelligenceEntity).filter(IntelligenceEntity.value == value).first()
        if not entity:
            entity = IntelligenceEntity(
                value=value,
                type=type_str,
                risk_score=risk_score,
                threat_level=threat_level,
                description=description,
                tags=tags
            )
            db.add(entity)
            db.commit()
            db.refresh(entity)
            
            # Sync to Neo4j
            neo4j_service.add_entity(entity.id, entity.value, entity.type, entity.risk_score)
            
        # Link to case
        is_linked = db.query(case_entities).filter_by(case_id=case.id, entity_id=entity.id).first()
        if not is_linked:
            db.execute(case_entities.insert().values(case_id=case.id, entity_id=entity.id))
            db.commit()
            
        imported_count += 1
        
    log_activity(
        db,
        case.id,
        "Data Imported",
        f"Imported {imported_count} indicators from CSV file '{file.filename}'. Skipped {skipped_count} invalid entries.",
        current_user.username
    )
    
    return {
        "success": True,
        "imported": imported_count,
        "skipped": skipped_count,
        "message": f"Successfully ingested {imported_count} indicators to case {case.case_id_str}."
    }

@router.post("/json", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def import_json_indicators(
    case_id: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Ingests threat indicators from a JSON feed array.
    Expected array object shape: { "value": "", "type": "", "risk_score": 50, "threat_level": "Medium", "description": "", "tags": [] }
    """
    try:
        case_uuid = uuid.UUID(case_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Case UUID.")
        
    case = db.query(Case).filter(Case.id == case_uuid).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case file not found.")

    contents = await file.read()
    try:
        data = json.loads(contents.decode("utf-8"))
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid JSON structure.")
        
    if not isinstance(data, list):
        # Allow single object import wrapping
        data = [data]
        
    imported_count = 0
    skipped_count = 0
    
    for item in data:
        value = item.get("value")
        type_str = item.get("type")
        
        if not value or not type_str:
            skipped_count += 1
            continue
            
        risk_score = item.get("risk_score", 50)
        threat_level = item.get("threat_level", "Medium")
        description = item.get("description", "")
        tags = item.get("tags", [])
        if not isinstance(tags, list):
            tags = [tags]
            
        # Get or create entity
        entity = db.query(IntelligenceEntity).filter(IntelligenceEntity.value == value).first()
        if not entity:
            entity = IntelligenceEntity(
                value=value,
                type=type_str,
                risk_score=risk_score,
                threat_level=threat_level,
                description=description,
                tags=tags
            )
            db.add(entity)
            db.commit()
            db.refresh(entity)
            
            # Sync to Neo4j
            neo4j_service.add_entity(entity.id, entity.value, entity.type, entity.risk_score)
            
        # Link to case
        is_linked = db.query(case_entities).filter_by(case_id=case.id, entity_id=entity.id).first()
        if not is_linked:
            db.execute(case_entities.insert().values(case_id=case.id, entity_id=entity.id))
            db.commit()
            
        imported_count += 1
        
    log_activity(
        db,
        case.id,
        "Data Imported",
        f"Imported {imported_count} indicators from JSON feed file '{file.filename}'.",
        current_user.username
    )
    
    return {
        "success": True,
        "imported": imported_count,
        "skipped": skipped_count,
        "message": f"Successfully ingested {imported_count} indicators to case {case.case_id_str}."
    }
