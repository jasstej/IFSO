-- ThreatLens PostgreSQL Database Schema
-- Designed for Law Enforcement and Incident Response Platforms

-- Enable UUID extension if supported
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Threat Actors
CREATE TABLE threat_actors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    aliases VARCHAR(255)[] NOT NULL DEFAULT '{}',
    country VARCHAR(100),
    motivation VARCHAR(255) NOT NULL,
    threat_level VARCHAR(50) NOT NULL CHECK (threat_level IN ('Low', 'Medium', 'High', 'Critical')),
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_threat_actors_name ON threat_actors(name);
CREATE INDEX idx_threat_actors_threat_level ON threat_actors(threat_level);

-- 2. Campaigns
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
CREATE INDEX idx_campaigns_status ON campaigns(status);

-- 3. Malware Families
CREATE TABLE malware_families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(100) NOT NULL, -- e.g., RAT, Ransomware, InfoStealer, Downloader
    first_seen DATE NOT NULL,
    risk_level VARCHAR(50) NOT NULL CHECK (risk_level IN ('Low', 'Medium', 'High', 'Critical')),
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_malware_name ON malware_families(name);

-- 4. Indicators of Compromise (IOCs)
CREATE TABLE iocs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    value VARCHAR(1024) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Domain', 'IP Address', 'URL', 'Email Address', 'SHA256 Hash', 'Cryptocurrency Wallet')),
    risk_score INT NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
    threat_level VARCHAR(50) NOT NULL CHECK (threat_level IN ('Low', 'Medium', 'High', 'Critical')),
    reputation VARCHAR(100) DEFAULT 'Unknown',
    description TEXT,
    tags VARCHAR(100)[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_iocs_type_value ON iocs(type, value);
CREATE INDEX idx_iocs_risk_score ON iocs(risk_score);

-- 5. MITRE ATT&CK Mapping
CREATE TABLE mitre_techniques (
    id VARCHAR(50) PRIMARY KEY, -- e.g., 'T1566'
    name VARCHAR(255) NOT NULL,
    tactic VARCHAR(100) NOT NULL -- e.g., 'Initial Access'
);

CREATE INDEX idx_mitre_tactic ON mitre_techniques(tactic);

-- 6. Cases (Investigation Workspace)
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
CREATE INDEX idx_cases_investigator ON cases(investigator);
CREATE INDEX idx_cases_status ON cases(status);

-- ----------------------------------------------------
-- RELATIONSHIP JUNCTION TABLES
-- ----------------------------------------------------

-- Threat Actor <-> Malware
CREATE TABLE actor_malware (
    threat_actor_id UUID REFERENCES threat_actors(id) ON DELETE CASCADE,
    malware_id UUID REFERENCES malware_families(id) ON DELETE CASCADE,
    PRIMARY KEY (threat_actor_id, malware_id)
);

-- Campaign <-> IOC
CREATE TABLE campaign_iocs (
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    ioc_id UUID REFERENCES iocs(id) ON DELETE CASCADE,
    PRIMARY KEY (campaign_id, ioc_id)
);

-- Malware <-> IOC
CREATE TABLE malware_iocs (
    malware_id UUID REFERENCES malware_families(id) ON DELETE CASCADE,
    ioc_id UUID REFERENCES iocs(id) ON DELETE CASCADE,
    PRIMARY KEY (malware_id, ioc_id)
);

-- Campaign <-> MITRE Technique
CREATE TABLE campaign_mitre (
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    technique_id VARCHAR(50) REFERENCES mitre_techniques(id) ON DELETE CASCADE,
    PRIMARY KEY (campaign_id, technique_id)
);

-- Case <-> Entity Links (Allows linking threat actor, iocs, etc., to cases)
CREATE TABLE case_entities (
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('Threat Actor', 'Campaign', 'Malware', 'IOC')),
    entity_id UUID NOT NULL,
    PRIMARY KEY (case_id, entity_type, entity_id)
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
CREATE TRIGGER update_iocs_updated_at BEFORE UPDATE ON iocs FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
