-- ThreatLens PostgreSQL Database Schema Version 2
-- Designed for Law Enforcement, Incident Response, and Cyber Intelligence Platform

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables to ensure a clean build
DROP TABLE IF EXISTS note_entities CASCADE;
DROP TABLE IF EXISTS evidence_entities CASCADE;
DROP TABLE IF EXISTS campaign_entities CASCADE;
DROP TABLE IF EXISTS actor_entities CASCADE;
DROP TABLE IF EXISTS case_entities CASCADE;
DROP TABLE IF EXISTS campaign_mitre CASCADE;
DROP TABLE IF EXISTS malware_iocs CASCADE;
DROP TABLE IF EXISTS campaign_iocs CASCADE;
DROP TABLE IF EXISTS actor_malware CASCADE;
DROP TABLE IF EXISTS case_activity_logs CASCADE;
DROP TABLE IF EXISTS analyst_note_versions CASCADE;
DROP TABLE IF EXISTS analyst_notes CASCADE;
DROP TABLE IF EXISTS evidence_chain_of_custody CASCADE;
DROP TABLE IF EXISTS evidence CASCADE;
DROP TABLE IF EXISTS cases CASCADE;
DROP TABLE IF EXISTS mitre_techniques CASCADE;
DROP TABLE IF EXISTS intelligence_entities CASCADE;
DROP TABLE IF EXISTS iocs CASCADE;
DROP TABLE IF EXISTS malware_families CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS threat_actors CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Users Table (Authentication and RBAC)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(255) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Investigator', 'Analyst')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Threat Actors Table
CREATE TABLE threat_actors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    aliases VARCHAR(255)[] NOT NULL DEFAULT '{}',
    country VARCHAR(100),
    motivation VARCHAR(255) NOT NULL,
    threat_level VARCHAR(50) NOT NULL CHECK (threat_level IN ('Low', 'Medium', 'High', 'Critical')),
    confidence_rating VARCHAR(50) DEFAULT 'High' CHECK (confidence_rating IN ('Low', 'Medium', 'High', 'Certain')),
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_threat_actors_name ON threat_actors(name);

-- 3. Campaigns Table
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('Planned', 'Active', 'Suspended', 'Completed')),
    threat_actor_id UUID REFERENCES threat_actors(id) ON DELETE SET NULL,
    target_sector VARCHAR(255)[] NOT NULL DEFAULT '{}',
    region VARCHAR(255)[] NOT NULL DEFAULT '{}',
    summary TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_campaigns_actor ON campaigns(threat_actor_id);

-- 4. Malware Families Table
CREATE TABLE malware_families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(100) NOT NULL,
    first_seen DATE NOT NULL,
    risk_level VARCHAR(50) NOT NULL CHECK (risk_level IN ('Low', 'Medium', 'High', 'Critical')),
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_malware_name ON malware_families(name);

-- 5. Intelligence Entities Table (Universal Threat Entities)
CREATE TABLE intelligence_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    value VARCHAR(1024) NOT NULL UNIQUE,
    type VARCHAR(100) NOT NULL CHECK (type IN (
        'IP Address', 'Domain', 'URL', 'Email', 'Phone Number', 
        'UPI ID', 'Cryptocurrency Wallet', 'Social Media Handle', 
        'Person of Interest', 'Organization', 'Device', 'SHA256 Hash'
    )),
    risk_score INT NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
    threat_level VARCHAR(50) NOT NULL CHECK (threat_level IN ('Low', 'Medium', 'High', 'Critical')),
    description TEXT,
    tags VARCHAR(100)[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_entities_value ON intelligence_entities(value);
CREATE INDEX idx_entities_type ON intelligence_entities(type);

-- 6. MITRE ATT&CK Mapping Table
CREATE TABLE mitre_techniques (
    id VARCHAR(50) PRIMARY KEY, -- e.g., 'T1566'
    name VARCHAR(255) NOT NULL,
    tactic VARCHAR(100) NOT NULL -- e.g., 'Initial Access'
);

-- 7. Cases Table (Investigation Dossier)
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id_str VARCHAR(100) NOT NULL UNIQUE, -- e.g. "TL-2026-0042"
    investigator VARCHAR(255) NOT NULL,
    priority VARCHAR(50) NOT NULL CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('Open', 'In Progress', 'Under Review', 'Closed')),
    summary TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cases_case_id ON cases(case_id_str);

-- 8. Evidence Table (Secure file tracking)
CREATE TABLE evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    filepath VARCHAR(1024) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    sha256_hash CHAR(64) NOT NULL,
    tags VARCHAR(100)[] DEFAULT '{}',
    description TEXT,
    uploaded_by VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_evidence_case ON evidence(case_id);
CREATE INDEX idx_evidence_hash ON evidence(sha256_hash);

-- 9. Evidence Chain of Custody Table
CREATE TABLE evidence_chain_of_custody (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    action VARCHAR(255) NOT NULL, -- e.g., 'Uploaded', 'Transferred', 'Analyzed', 'Archived'
    custodian VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    notes TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chain_evidence ON evidence_chain_of_custody(evidence_id);

-- 10. Analyst Notes Table
CREATE TABLE analyst_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    is_private BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notes_case ON analyst_notes(case_id);

-- 11. Analyst Note Versions Table (Change history)
CREATE TABLE analyst_note_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID NOT NULL REFERENCES analyst_notes(id) ON DELETE CASCADE,
    version INT NOT NULL,
    content TEXT NOT NULL,
    modified_by VARCHAR(255) NOT NULL,
    modified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_note_versions_note ON analyst_note_versions(note_id);

-- 12. Case Activity Logs (Timelines & Audits)
CREATE TABLE case_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL, -- e.g., 'Case Created', 'Status Changed', 'Evidence Uploaded', 'Note Added'
    description TEXT NOT NULL,
    performed_by VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_case ON case_activity_logs(case_id);

-- ----------------------------------------------------
-- RELATIONSHIP JUNCTION TABLES
-- ----------------------------------------------------

-- Threat Actor <-> Malware
CREATE TABLE actor_malware (
    threat_actor_id UUID REFERENCES threat_actors(id) ON DELETE CASCADE,
    malware_id UUID REFERENCES malware_families(id) ON DELETE CASCADE,
    PRIMARY KEY (threat_actor_id, malware_id)
);

-- Campaign <-> MITRE Technique
CREATE TABLE campaign_mitre (
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    technique_id VARCHAR(50) REFERENCES mitre_techniques(id) ON DELETE CASCADE,
    PRIMARY KEY (campaign_id, technique_id)
);

-- Case <-> Entity Links
CREATE TABLE case_entities (
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    entity_id UUID REFERENCES intelligence_entities(id) ON DELETE CASCADE,
    PRIMARY KEY (case_id, entity_id)
);

-- Threat Actor <-> Entity Links
CREATE TABLE actor_entities (
    threat_actor_id UUID REFERENCES threat_actors(id) ON DELETE CASCADE,
    entity_id UUID REFERENCES intelligence_entities(id) ON DELETE CASCADE,
    PRIMARY KEY (threat_actor_id, entity_id)
);

-- Campaign <-> Entity Links
CREATE TABLE campaign_entities (
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    entity_id UUID REFERENCES intelligence_entities(id) ON DELETE CASCADE,
    PRIMARY KEY (campaign_id, entity_id)
);

-- Evidence <-> Entity Links
CREATE TABLE evidence_entities (
    evidence_id UUID REFERENCES evidence(id) ON DELETE CASCADE,
    entity_id UUID REFERENCES intelligence_entities(id) ON DELETE CASCADE,
    PRIMARY KEY (evidence_id, entity_id)
);

-- Note <-> Entity Links
CREATE TABLE note_entities (
    note_id UUID REFERENCES analyst_notes(id) ON DELETE CASCADE,
    entity_id UUID REFERENCES intelligence_entities(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, entity_id)
);

-- ----------------------------------------------------
-- SECURITY TRIGGERS FOR TIMESTAMPS
-- ----------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_threat_actors_updated_at BEFORE UPDATE ON threat_actors FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_malware_families_updated_at BEFORE UPDATE ON malware_families FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_intelligence_entities_updated_at BEFORE UPDATE ON intelligence_entities FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_analyst_notes_updated_at BEFORE UPDATE ON analyst_notes FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
