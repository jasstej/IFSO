import re
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import Case, AnalystNote, NoteVersion, IntelligenceEntity, note_entities, User
from app.schemas.schemas import AnalystNoteResponse, AnalystNoteCreate
from app.core.security import get_current_user

router = APIRouter(prefix="/notes", tags=["Analyst Notes"])

def parse_and_link_entities(db: Session, note: AnalystNote, content: str):
    """
    Parses note content for double-bracketed entity references (e.g. [[185.123.45.67]])
    and automatically associates them with the note in the database.
    """
    # Find all strings inside [[ ]]
    matches = re.findall(r"\[\[(.*?)\]\]", content)
    if not matches:
        return
        
    # Clear existing links first
    db.execute(note_entities.delete().where(note_entities.c.note_id == note.id))
    db.commit()
    
    for val in set(matches):
        val = val.strip()
        # Look up entity in database
        entity = db.query(IntelligenceEntity).filter(IntelligenceEntity.value == val).first()
        if entity:
            db.execute(note_entities.insert().values(note_id=note.id, entity_id=entity.id))
    db.commit()

@router.get("/case/{case_id}", response_model=List[AnalystNoteResponse])
def get_case_notes(
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve all notes for a case.
    Filters out private notes unless they belong to the current authenticated user.
    """
    try:
        case_uuid = uuid.UUID(case_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid Case UUID.")
        
    notes = db.query(AnalystNote).filter(AnalystNote.case_id == case_uuid).all()
    
    # Filter private notes
    filtered = []
    for note in notes:
        if not note.is_private or note.created_by == current_user.username:
            filtered.append(note)
            
    return filtered

@router.post("", response_model=AnalystNoteResponse, status_code=status.HTTP_201_CREATED)
def create_note(
    note_in: AnalystNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Creates a new analyst note, initiates version 1, and links any [[entity]] matches."""
    # Check case exists
    case = db.query(Case).filter(Case.id == note_in.case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found.")
        
    new_note = AnalystNote(
        case_id=note_in.case_id,
        title=note_in.title,
        content=note_in.content,
        is_private=note_in.is_private,
        created_by=current_user.username
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    
    # Store Version 1
    v1 = NoteVersion(
        note_id=new_note.id,
        version=1,
        content=note_in.content,
        modified_by=current_user.username
    )
    db.add(v1)
    db.commit()
    
    # Parse and link entities
    parse_and_link_entities(db, new_note, note_in.content)
    
    db.refresh(new_note)
    return new_note

@router.put("/{note_id}", response_model=AnalystNoteResponse)
def update_note(
    note_id: str,
    note_in: AnalystNoteCreate,  # Reuse create schema
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Updates an existing note, increments the version count, and records historical diff."""
    note = db.query(AnalystNote).filter(AnalystNote.id == uuid.UUID(note_id)).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found.")
        
    # Check authorization
    if note.is_private and note.created_by != current_user.username:
        raise HTTPException(status_code=403, detail="Access denied to this private note.")
        
    # Determine next version number
    last_version = db.query(NoteVersion).filter(NoteVersion.note_id == note.id).order_by(NoteVersion.version.desc()).first()
    next_ver_num = (last_version.version + 1) if last_version else 1
    
    # Save edits
    note.title = note_in.title
    note.content = note_in.content
    note.is_private = note_in.is_private
    db.commit()
    
    # Save historical version
    new_ver = NoteVersion(
        note_id=note.id,
        version=next_ver_num,
        content=note_in.content,
        modified_by=current_user.username
    )
    db.add(new_ver)
    db.commit()
    
    # Re-parse entity links
    parse_and_link_entities(db, note, note_in.content)
    
    db.refresh(note)
    return note

@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_note(
    note_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deletes an analyst note and its versions."""
    note = db.query(AnalystNote).filter(AnalystNote.id == uuid.UUID(note_id)).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found.")
        
    if note.created_by != current_user.username and current_user.role != "Admin":
        raise HTTPException(status_code=403, detail="Only the note author or Admin can delete notes.")
        
    db.delete(note)
    db.commit()
    return status.HTTP_204_NO_CONTENT
