from sqlalchemy import Column, String, Integer, Date, DateTime, Table, ForeignKey, Text, CheckConstraint, Boolean, BigInteger
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
import uuid
from datetime import datetime

Base = declarative_base()

# Many-to-Many Junction Tables
actor_malware = Table(
    "actor_malware",
    Base.metadata,
    Column("threat_actor_id", UUID(as_uuid=True), ForeignKey("threat_actors.id", ondelete="CASCADE"), primary_key=True),
    Column("malware_id", UUID(as_uuid=True), ForeignKey("malware_families.id", ondelete="CASCADE"), primary_key=True)
)

campaign_mitre = Table(
    "campaign_mitre",
    Base.metadata,
    Column("campaign_id", UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="CASCADE"), primary_key=True),
    Column("technique_id", String(50), ForeignKey("mitre_techniques.id", ondelete="CASCADE"), primary_key=True)
)

case_entities = Table(
    "case_entities",
    Base.metadata,
    Column("case_id", UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), primary_key=True),
    Column("entity_id", UUID(as_uuid=True), ForeignKey("intelligence_entities.id", ondelete="CASCADE"), primary_key=True)
)

actor_entities = Table(
    "actor_entities",
    Base.metadata,
    Column("threat_actor_id", UUID(as_uuid=True), ForeignKey("threat_actors.id", ondelete="CASCADE"), primary_key=True),
    Column("entity_id", UUID(as_uuid=True), ForeignKey("intelligence_entities.id", ondelete="CASCADE"), primary_key=True)
)

campaign_entities = Table(
    "campaign_entities",
    Base.metadata,
    Column("campaign_id", UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="CASCADE"), primary_key=True),
    Column("entity_id", UUID(as_uuid=True), ForeignKey("intelligence_entities.id", ondelete="CASCADE"), primary_key=True)
)

evidence_entities = Table(
    "evidence_entities",
    Base.metadata,
    Column("evidence_id", UUID(as_uuid=True), ForeignKey("evidence.id", ondelete="CASCADE"), primary_key=True),
    Column("entity_id", UUID(as_uuid=True), ForeignKey("intelligence_entities.id", ondelete="CASCADE"), primary_key=True)
)

note_entities = Table(
    "note_entities",
    Base.metadata,
    Column("note_id", UUID(as_uuid=True), ForeignKey("analyst_notes.id", ondelete="CASCADE"), primary_key=True),
    Column("entity_id", UUID(as_uuid=True), ForeignKey("intelligence_entities.id", ondelete="CASCADE"), primary_key=True)
)

# 1. Users
class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(255), nullable=False, unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    __table_args__ = (
        CheckConstraint("role IN ('Admin', 'Investigator', 'Analyst')", name="chk_user_role"),
    )

# 2. Threat Actors
class ThreatActor(Base):
    __tablename__ = "threat_actors"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, unique=True, index=True)
    aliases = Column(ARRAY(String(255)), nullable=False, default=[])
    country = Column(String(100))
    motivation = Column(String(255), nullable=False)
    threat_level = Column(String(50), nullable=False)
    confidence_rating = Column(String(50), default="High")
    description = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    campaigns = relationship("Campaign", back_populates="actor")
    malware = relationship("MalwareFamily", secondary=actor_malware, back_populates="actors")
    entities = relationship("IntelligenceEntity", secondary=actor_entities, back_populates="actors")
    
    __table_args__ = (
        CheckConstraint("threat_level IN ('Low', 'Medium', 'High', 'Critical')", name="chk_threat_level"),
        CheckConstraint("confidence_rating IN ('Low', 'Medium', 'High', 'Certain')", name="chk_confidence_rating"),
    )

# 3. Campaigns
class Campaign(Base):
    __tablename__ = "campaigns"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, unique=True, index=True)
    start_date = Column(Date, nullable=False)
    status = Column(String(50), nullable=False)
    threat_actor_id = Column(UUID(as_uuid=True), ForeignKey("threat_actors.id", ondelete="SET NULL"), index=True)
    target_sector = Column(ARRAY(String(255)), nullable=False, default=[])
    region = Column(ARRAY(String(255)), nullable=False, default=[])
    summary = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    actor = relationship("ThreatActor", back_populates="campaigns")
    techniques = relationship("MitreTechnique", secondary=campaign_mitre, back_populates="campaigns")
    entities = relationship("IntelligenceEntity", secondary=campaign_entities, back_populates="campaigns")
    
    __table_args__ = (
        CheckConstraint("status IN ('Planned', 'Active', 'Suspended', 'Completed')", name="chk_status"),
    )

# 4. Malware Families
class MalwareFamily(Base):
    __tablename__ = "malware_families"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, unique=True, index=True)
    type = Column(String(100), nullable=False)
    first_seen = Column(Date, nullable=False)
    risk_level = Column(String(50), nullable=False)
    description = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    actors = relationship("ThreatActor", secondary=actor_malware, back_populates="malware")
    
    __table_args__ = (
        CheckConstraint("risk_level IN ('Low', 'Medium', 'High', 'Critical')", name="chk_risk_level"),
    )

# 5. Intelligence Entities
class IntelligenceEntity(Base):
    __tablename__ = "intelligence_entities"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    value = Column(String(1024), nullable=False, unique=True, index=True)
    type = Column(String(100), nullable=False)
    risk_score = Column(Integer, nullable=False)
    threat_level = Column(String(50), nullable=False)
    description = Column(Text)
    tags = Column(ARRAY(String(100)), default=[])
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    cases = relationship("Case", secondary=case_entities, back_populates="entities")
    actors = relationship("ThreatActor", secondary=actor_entities, back_populates="entities")
    campaigns = relationship("Campaign", secondary=campaign_entities, back_populates="entities")
    evidence = relationship("Evidence", secondary=evidence_entities, back_populates="entities")
    notes = relationship("AnalystNote", secondary=note_entities, back_populates="entities")
    
    __table_args__ = (
        CheckConstraint("type IN ('IP Address', 'Domain', 'URL', 'Email', 'Phone Number', 'UPI ID', 'Cryptocurrency Wallet', 'Social Media Handle', 'Person of Interest', 'Organization', 'Device', 'SHA256 Hash')", name="chk_entity_type"),
        CheckConstraint("risk_score BETWEEN 0 AND 100", name="chk_risk_score"),
        CheckConstraint("threat_level IN ('Low', 'Medium', 'High', 'Critical')", name="chk_threat_level"),
    )

# 6. MITRE ATT&CK Mapping
class MitreTechnique(Base):
    __tablename__ = "mitre_techniques"
    
    id = Column(String(50), primary_key=True)
    name = Column(String(255), nullable=False)
    tactic = Column(String(100), nullable=False)
    
    campaigns = relationship("Campaign", secondary=campaign_mitre, back_populates="techniques")

# 7. Cases (Investigation Workspace)
class Case(Base):
    __tablename__ = "cases"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id_str = Column(String(100), nullable=False, unique=True, index=True)
    investigator = Column(String(255), nullable=False, index=True)
    priority = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False)
    summary = Column(Text, nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    evidence = relationship("Evidence", back_populates="case", cascade="all, delete-orphan")
    analyst_notes = relationship("AnalystNote", back_populates="case", cascade="all, delete-orphan")
    entities = relationship("IntelligenceEntity", secondary=case_entities, back_populates="cases")
    logs = relationship("CaseActivityLog", back_populates="case", cascade="all, delete-orphan")
    
    __table_args__ = (
        CheckConstraint("priority IN ('Low', 'Medium', 'High', 'Critical')", name="chk_priority"),
        CheckConstraint("status IN ('Open', 'In Progress', 'Under Review', 'Closed')", name="chk_status"),
    )

# 8. Evidence Table
class Evidence(Base):
    __tablename__ = "evidence"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    filepath = Column(String(1024), nullable=False)
    file_size = Column(BigInteger)
    mime_type = Column(String(100))
    sha256_hash = Column(String(64), nullable=False, index=True)
    tags = Column(ARRAY(String(100)), default=[])
    description = Column(Text)
    uploaded_by = Column(String(255), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    case = relationship("Case", back_populates="evidence")
    chain = relationship("EvidenceChainOfCustody", back_populates="evidence", cascade="all, delete-orphan")
    entities = relationship("IntelligenceEntity", secondary=evidence_entities, back_populates="evidence")

# 9. Evidence Chain of Custody
class EvidenceChainOfCustody(Base):
    __tablename__ = "evidence_chain_of_custody"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    evidence_id = Column(UUID(as_uuid=True), ForeignKey("evidence.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(255), nullable=False)  # 'Uploaded', 'Transferred', 'Analyzed', 'Archived'
    custodian = Column(String(255), nullable=False)
    location = Column(String(255))
    notes = Column(Text)
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    evidence = relationship("Evidence", back_populates="chain")

# 10. Analyst Notes
class AnalystNote(Base):
    __tablename__ = "analyst_notes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    is_private = Column(Boolean, default=False)
    created_by = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    case = relationship("Case", back_populates="analyst_notes")
    versions = relationship("NoteVersion", back_populates="note", cascade="all, delete-orphan")
    entities = relationship("IntelligenceEntity", secondary=note_entities, back_populates="notes")

# 11. Analyst Note Versions
class NoteVersion(Base):
    __tablename__ = "analyst_note_versions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    note_id = Column(UUID(as_uuid=True), ForeignKey("analyst_notes.id", ondelete="CASCADE"), nullable=False)
    version = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    modified_by = Column(String(255), nullable=False)
    modified_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    note = relationship("AnalystNote", back_populates="versions")

# 12. Case Activity Logs
class CaseActivityLog(Base):
    __tablename__ = "case_activity_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    activity_type = Column(String(100), nullable=False)  # 'Case Created', 'Status Changed', 'Evidence Uploaded', etc.
    description = Column(Text, nullable=False)
    performed_by = Column(String(255), nullable=False)
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    case = relationship("Case", back_populates="logs")
