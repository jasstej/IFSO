from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import date, datetime
from uuid import UUID

# Token & Authentication Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)

class UserCreate(UserBase):
    password: str = Field(..., min_length=12, max_length=128)
    role: str = Field("Analyst", pattern="^(Admin|Investigator|Analyst)$")

class UserLogin(UserBase):
    password: str

class UserResponse(UserBase):
    id: UUID
    role: str
    
    class Config:
        from_attributes = True

# Intelligence Entity Schemas
class IntelligenceEntityBase(BaseModel):
    value: str = Field(..., max_length=1024)
    type: str = Field(..., pattern="^(IP Address|Domain|URL|Email|Phone Number|UPI ID|Cryptocurrency Wallet|Social Media Handle|Person of Interest|Organization|Device|SHA256 Hash)$")
    risk_score: int = Field(..., ge=0, le=100)
    threat_level: str = Field("Medium", pattern="^(Low|Medium|High|Critical)$")
    description: Optional[str] = None
    tags: List[str] = []

class IntelligenceEntityCreate(IntelligenceEntityBase):
    pass

class IntelligenceEntityResponse(IntelligenceEntityBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# IOC Compatibility Schemas
class IOCBase(BaseModel):
    value: str = Field(..., max_length=1024)
    type: str = Field(..., pattern="^(Domain|IP Address|URL|Email Address|SHA256 Hash|Cryptocurrency Wallet)$")
    risk_score: int = Field(..., ge=0, le=100)
    threat_level: str = Field("Medium", pattern="^(Low|Medium|High|Critical)$")
    reputation: Optional[str] = Field("Unknown", max_length=100)
    description: Optional[str] = None
    tags: List[str] = []

class IOCCreate(IOCBase):
    pass

class IOCResponse(IOCBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Threat Actor Schemas
class ThreatActorBase(BaseModel):
    name: str = Field(..., max_length=255)
    aliases: List[str] = []
    country: Optional[str] = Field(None, max_length=100)
    motivation: str = Field(..., max_length=255)
    threat_level: str = Field("Medium", pattern="^(Low|Medium|High|Critical)$")
    confidence_rating: str = Field("High", pattern="^(Low|Medium|High|Certain)$")
    description: str

class ThreatActorCreate(ThreatActorBase):
    pass

class ThreatActorResponse(ThreatActorBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ThreatActorDetailsResponse(BaseModel):
    name: str
    aliases: List[str]
    country: Optional[str]
    motivation: str
    threat_level: str
    confidence_rating: str
    summary: str
    infrastructure: List[Dict[str, Any]]
    malware: List[Dict[str, Any]]
    attack: List[Dict[str, Any]]
    timeline: List[Dict[str, Any]]

# Campaign Schemas
class CampaignBase(BaseModel):
    name: str = Field(..., max_length=255)
    start_date: date
    status: str = Field("Active", pattern="^(Planned|Active|Suspended|Completed)$")
    threat_actor_id: Optional[UUID] = None
    target_sector: List[str] = []
    region: List[str] = []
    summary: str

class CampaignCreate(CampaignBase):
    pass

class CampaignResponse(CampaignBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Malware Family Schemas
class MalwareFamilyBase(BaseModel):
    name: str = Field(..., max_length=255)
    type: str = Field(..., max_length=100)
    first_seen: date
    risk_level: str = Field("Medium", pattern="^(Low|Medium|High|Critical)$")
    description: str

class MalwareFamilyCreate(MalwareFamilyBase):
    pass

class MalwareFamilyResponse(MalwareFamilyBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Case Schemas
class CaseBase(BaseModel):
    case_id_str: str = Field(..., max_length=100)
    investigator: str = Field(..., max_length=255)
    priority: str = Field("Medium", pattern="^(Low|Medium|High|Critical)$")
    status: str = Field("Open", pattern="^(Open|In Progress|Under Review|Closed)$")
    summary: str
    notes: Optional[str] = None

class CaseCreate(CaseBase):
    pass

class CaseResponse(CaseBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CaseActivityLogResponse(BaseModel):
    id: UUID
    case_id: UUID
    activity_type: str
    description: str
    performed_by: str
    timestamp: datetime

    class Config:
        from_attributes = True

# Evidence Schemas
class EvidenceBase(BaseModel):
    filename: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    sha256_hash: str = Field(..., min_length=64, max_length=64)
    tags: List[str] = []
    description: Optional[str] = None

class EvidenceCreate(EvidenceBase):
    case_id: UUID

class EvidenceChainOfCustodyResponse(BaseModel):
    id: UUID
    evidence_id: UUID
    action: str
    custodian: str
    location: Optional[str] = None
    notes: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True

class EvidenceResponse(EvidenceBase):
    id: UUID
    case_id: UUID
    filepath: str
    uploaded_by: str
    uploaded_at: datetime
    chain: List[EvidenceChainOfCustodyResponse] = []

    class Config:
        from_attributes = True

# Analyst Note Schemas
class AnalystNoteBase(BaseModel):
    title: str = Field(..., max_length=255)
    content: str
    is_private: bool = False

class AnalystNoteCreate(AnalystNoteBase):
    case_id: UUID

class NoteVersionResponse(BaseModel):
    id: UUID
    note_id: UUID
    version: int
    content: str
    modified_by: str
    modified_at: datetime

    class Config:
        from_attributes = True

class AnalystNoteResponse(AnalystNoteBase):
    id: UUID
    case_id: UUID
    created_by: str
    created_at: datetime
    updated_at: datetime
    versions: List[NoteVersionResponse] = []

    class Config:
        from_attributes = True

# Graph Visualization Schemas
class GraphNode(BaseModel):
    id: str
    label: str
    type: str  # Actor, Campaign, Malware, Domain, IP, Hash, Wallet, Sector, etc.
    riskScore: Optional[int] = None
    x: Optional[float] = None
    y: Optional[float] = None

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: str  # LAUNCHED, USES, COMMUNICATES_WITH, RESOLVES_TO, TARGETS, etc.

class CorrelationGraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]

# Correlation Engine Schemas
class SharedCorrelation(BaseModel):
    entity_id: UUID
    entity_value: str
    entity_type: str
    confidence_score: int
    reason: str
    cases: List[Dict[str, Any]]
    actors: List[Dict[str, Any]]
    campaigns: List[Dict[str, Any]]
