// ThreatLens Neo4j Cypher Graph Schema & Queries
// Used to model and query relationships between actors, campaigns, malware, infrastructure, and targets

// ----------------------------------------------------
// 1. CONSTRAINTS & INDEXES
// ----------------------------------------------------

CREATE CONSTRAINT actor_unique_name IF NOT EXISTS
FOR (a:ThreatActor) REQUIRE a.name IS UNIQUE;

CREATE CONSTRAINT campaign_unique_name IF NOT EXISTS
FOR (c:Campaign) REQUIRE c.name IS UNIQUE;

CREATE CONSTRAINT malware_unique_name IF NOT EXISTS
FOR (m:Malware) REQUIRE m.name IS UNIQUE;

CREATE CONSTRAINT ioc_unique_value IF NOT EXISTS
FOR (i:IOC) REQUIRE i.value IS UNIQUE;

CREATE INDEX ioc_type_index IF NOT EXISTS
FOR (i:IOC) ON (i.type);

CREATE INDEX sector_name_index IF NOT EXISTS
FOR (s:VictimSector) ON (s.name);

// ----------------------------------------------------
// 2. DATA IMPORT / NODE INITIALIZATION (SAMPLE DATA)
// ----------------------------------------------------

// Create Threat Actors
MERGE (apt28:ThreatActor {name: 'APT28', country: 'Russia', motivation: 'State-Sponsored Espionage', level: 'Critical'})
MERGE (lazarus:ThreatActor {name: 'Lazarus Group', country: 'North Korea', motivation: 'Financial Theft & Espionage', level: 'Critical'})
MERGE (fin7:ThreatActor {name: 'FIN7', country: 'Unknown', motivation: 'Financial Gain', level: 'High'});

// Create Campaigns
MERGE (ghostshell:Campaign {name: 'Operation GhostShell', target: 'Government & Defense', region: 'Europe', status: 'Active'})
MERGE (golddragon:Campaign {name: 'Operation GoldDragon', target: 'Financial & Energy', region: 'Asia-Pacific', status: 'Active'})
MERGE (carbanak:Campaign {name: 'Operation Carbanak', target: 'Retail & Hospitality', region: 'North America', status: 'Completed'});

// Create Malware Families
MERGE (emotet:Malware {name: 'Emotet', type: 'Downloader', level: 'Critical'})
MERGE (trickbot:Malware {name: 'TrickBot', type: 'RAT / Modular Trojan', level: 'High'})
MERGE (agenttesla:Malware {name: 'AgentTesla', type: 'InfoStealer', level: 'High'});

// Create Victim Sectors
MERGE (govSector:VictimSector {name: 'Government'})
MERGE (defSector:VictimSector {name: 'Defense'})
MERGE (finSector:VictimSector {name: 'Financial Services'})
MERGE (energySector:VictimSector {name: 'Energy'})
MERGE (retailSector:VictimSector {name: 'Retail'});

// Create Indicators of Compromise (IOCs)
MERGE (domain1:IOC {value: 'upgrade-microsoft-service.com', type: 'Domain', score: 85})
MERGE (ip1:IOC {value: '185.123.45.67', type: 'IP Address', score: 90})
MERGE (hash1:IOC {value: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', type: 'SHA256 Hash', score: 100})
MERGE (wallet1:IOC {value: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', type: 'Cryptocurrency Wallet', score: 95})
MERGE (domain2:IOC {value: 'secure-bank-gateway.net', type: 'Domain', score: 80})
MERGE (ip2:IOC {value: '190.23.111.44', type: 'IP Address', score: 75});

// ----------------------------------------------------
// 3. BUILD RELATIONSHIPS
// ----------------------------------------------------

// Threat Actor -> Campaign
MATCH (a:ThreatActor {name: 'APT28'}), (c:Campaign {name: 'Operation GhostShell'}) MERGE (a)-[:LAUNCHED]->(c);
MATCH (a:ThreatActor {name: 'Lazarus Group'}), (c:Campaign {name: 'Operation GoldDragon'}) MERGE (a)-[:LAUNCHED]->(c);
MATCH (a:ThreatActor {name: 'FIN7'}), (c:Campaign {name: 'Operation Carbanak'}) MERGE (a)-[:LAUNCHED]->(c);

// Threat Actor -> Malware
MATCH (a:ThreatActor {name: 'APT28'}), (m:Malware {name: 'AgentTesla'}) MERGE (a)-[:USES]->(m);
MATCH (a:ThreatActor {name: 'Lazarus Group'}), (m:Malware {name: 'TrickBot'}) MERGE (a)-[:USES]->(m);
MATCH (a:ThreatActor {name: 'FIN7'}), (m:Malware {name: 'Emotet'}) MERGE (a)-[:USES]->(m);

// Malware -> Domain
MATCH (m:Malware {name: 'AgentTesla'}), (i:IOC {value: 'upgrade-microsoft-service.com'}) MERGE (m)-[:COMMUNICATES_WITH]->(i);
MATCH (m:Malware {name: 'TrickBot'}), (i:IOC {value: 'secure-bank-gateway.net'}) MERGE (m)-[:COMMUNICATES_WITH]->(i);

// Domain -> IP
MATCH (d:IOC {value: 'upgrade-microsoft-service.com'}), (ip:IOC {value: '185.123.45.67'}) MERGE (d)-[:RESOLVES_TO]->(ip);
MATCH (d:IOC {value: 'secure-bank-gateway.net'}), (ip:IOC {value: '190.23.111.44'}) MERGE (d)-[:RESOLVES_TO]->(ip);

// Campaign -> Victim Sector
MATCH (c:Campaign {name: 'Operation GhostShell'}), (s:VictimSector {name: 'Government'}) MERGE (c)-[:TARGETS]->(s);
MATCH (c:Campaign {name: 'Operation GhostShell'}), (s:VictimSector {name: 'Defense'}) MERGE (c)-[:TARGETS]->(s);
MATCH (c:Campaign {name: 'Operation GoldDragon'}), (s:VictimSector {name: 'Financial Services'}) MERGE (c)-[:TARGETS]->(s);
MATCH (c:Campaign {name: 'Operation GoldDragon'}), (s:VictimSector {name: 'Energy'}) MERGE (c)-[:TARGETS]->(s);
MATCH (c:Campaign {name: 'Operation Carbanak'}), (s:VictimSector {name: 'Retail'}) MERGE (c)-[:TARGETS]->(s);

// Campaign -> IOC
MATCH (c:Campaign {name: 'Operation GoldDragon'}), (i:IOC {value: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'}) MERGE (c)-[:EXPLOITS_WITH]->(i);
MATCH (c:Campaign {name: 'Operation GhostShell'}), (i:IOC {value: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}) MERGE (c)-[:EXPLOITS_WITH]->(i);

// ----------------------------------------------------
// 4. CORE QUERIES FOR PLATFORM API
// ----------------------------------------------------

// Fetch full correlation graph (Returns all nodes and edges)
MATCH (n)-[r]->(m)
RETURN n, r, m;

// Fetch relationship path for a specific Threat Actor (e.g., APT28)
MATCH path = (a:ThreatActor {name: 'APT28'})-[*1..3]->(connectedNode)
RETURN path;

// Find all malware and domains associated with a campaign
MATCH (c:Campaign {name: 'Operation GhostShell'})<-[:LAUNCHED]-(a:ThreatActor)-[:USES]->(m:Malware)-[:COMMUNICATES_WITH]->(d:IOC)
RETURN c, a, m, d;

// Risk scoring - find the count of critical assets/domains related to an actor
MATCH (a:ThreatActor)-[:USES|LAUNCHED*1..3]->(i:IOC)
WHERE i.score > 80
RETURN a.name, count(i) as HighRiskIOCs;
