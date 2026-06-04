// ThreatLens Mock Intelligence Database
// Realistic cybercrime and espionage data tailored for law enforcement & security analyst workflows

export interface ThreatActor {
  id: string
  name: string
  aliases: string[]
  country: string
  motivation: string
  threat_level: "Low" | "Medium" | "High" | "Critical"
  description: string
  infrastructure: { type: string; value: string; status: string; ip_resolved?: string }[]
  malware: { name: string; type: string; risk: string; first_seen: string }[]
  attack: { tactic: string; technique_id: string; technique: string }[]
  timeline: { date: string; event: string }[]
}

export interface Campaign {
  id: string
  name: string
  start_date: string
  status: "Planned" | "Active" | "Suspended" | "Completed"
  threat_actor: string
  target_sector: string[]
  region: string[]
  summary: string
  timeline: { date: string; event: string }[]
  heatmap: { sector: string; weight: number }[]
  iocs: string[] // linked IOC values
}

export interface MalwareFamily {
  id: string
  name: string
  type: string
  first_seen: string
  risk_level: "Low" | "Medium" | "High" | "Critical"
  description: string
  ioc_count: number
  campaign_count: number
  associated_actors: string[]
  related_infrastructure: { value: string; type: string; relation: string }[]
}

export interface IOC {
  id: string
  value: string
  type: "Domain" | "IP Address" | "URL" | "Email Address" | "SHA256 Hash" | "Cryptocurrency Wallet"
  risk_score: number
  threat_level: "Low" | "Medium" | "High" | "Critical"
  reputation: "Clean" | "Suspicious" | "Malicious" | "Unknown"
  description: string
  tags: string[]
  created_at: string
}

export interface Case {
  id: string
  case_id_str: string
  investigator: string
  priority: "Low" | "Medium" | "High" | "Critical"
  status: "Open" | "In Progress" | "Under Review" | "Closed"
  summary: string
  notes: string
  created_at: string
  updated_at: string
  linked_entities: { type: string; id: string; name: string }[]
}

// 1. Threat Actors
export const mockActors: ThreatActor[] = [
  {
    id: "actor-apt28",
    name: "APT28",
    aliases: ["Fancy Bear", "Sofacy", "Pawn Storm", "Sednit"],
    country: "Russia",
    motivation: "State-Sponsored Espionage",
    threat_level: "Critical",
    description: "Linked to the Russian General Staff Main Intelligence Directorate (GRU) 85th Main Special Service Center (GTsSS) military unit 26165. Operates cyber espionage campaigns against defense, government, and utility sectors globally since at least 2004.",
    infrastructure: [
      { type: "Domain", value: "upgrade-microsoft-service.com", status: "Active C2", ip_resolved: "185.123.45.67" },
      { type: "IP Address", value: "185.123.45.67", status: "Active C2", ip_resolved: "N/A" },
      { type: "Domain", value: "mail-security-alert.org", status: "Suspended", ip_resolved: "91.22.113.88" }
    ],
    malware: [
      { name: "AgentTesla", type: "InfoStealer", risk: "High", first_seen: "2020-04-12" },
      { name: "X-Agent", type: "RAT", risk: "Critical", first_seen: "2015-08-22" }
    ],
    attack: [
      { tactic: "Initial Access", technique_id: "T1566", technique: "Phishing: Spearphishing Attachment" },
      { tactic: "Execution", technique_id: "T1059", technique: "Command and Scripting Interpreter: PowerShell" },
      { tactic: "Credential Access", technique_id: "T1003", technique: "OS Credential Dumping: LSASS Memory" }
    ],
    timeline: [
      { date: "2026-06-04", event: "Active scan probes detected against Baltic procurement portals." },
      { date: "2026-04-01", event: "Initiated Operation GhostShell campaign targeting government endpoints." },
      { date: "2025-11-12", event: "Exfiltrated 20GB of intelligence from Western military logistics channels." }
    ]
  },
  {
    id: "actor-lazarus",
    name: "Lazarus Group",
    aliases: ["Hidden Cobra", "Guardians of Peace", "APT38", "TEMP.Hermit"],
    country: "North Korea",
    motivation: "Financial Theft & Espionage",
    threat_level: "Critical",
    description: "North Korean state-sponsored operations active since 2009. Combines destructive attacks (e.g. Wiper campaigns) with sophisticated cryptocurrency laundering networks and heist campaigns targeting global financial trading hubs.",
    infrastructure: [
      { type: "Cryptocurrency Wallet", value: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", status: "Active Monitor", ip_resolved: "N/A" },
      { type: "Domain", value: "secure-bank-gateway.net", status: "Active C2", ip_resolved: "190.23.111.44" },
      { type: "IP Address", value: "190.23.111.44", status: "Active Redirector", ip_resolved: "N/A" }
    ],
    malware: [
      { name: "TrickBot", type: "Modular Trojan", risk: "High", first_seen: "2019-10-14" },
      { name: "HermitWiper", type: "Wiper", risk: "Critical", first_seen: "2022-02-23" }
    ],
    attack: [
      { tactic: "Initial Access", technique_id: "T1566", technique: "Phishing: Spearphishing Link" },
      { tactic: "Defense Evasion", technique_id: "T1562", technique: "Impair Defenses: Disable Antivirus" },
      { tactic: "Exfiltration", technique_id: "T1048", technique: "Exfiltration Over Alternative Protocol" }
    ],
    timeline: [
      { date: "2026-06-03", event: "Exfiltrated $42M equivalent in tokens from decentralized ledger protocols." },
      { date: "2026-01-15", event: "Initiated Operation GoldDragon logistics compromise vector." },
      { date: "2025-08-01", event: "Coordinated swift gateway modifications against retail trading hubs." }
    ]
  },
  {
    id: "actor-fin7",
    name: "FIN7",
    aliases: ["Carbanak Group", "Navigator Group", "ITG14"],
    country: "Unknown",
    motivation: "Financial Gain",
    threat_level: "High",
    description: "A highly commercialized and structured cybercriminal enterprise. Operates since 2015, utilizing front companies (e.g. Bastion Secure) to recruit developers for point-of-sale malware deployment and retail credit theft networks.",
    infrastructure: [
      { type: "Domain", value: "pos-terminal-sync.com", status: "Suspicious Resolver", ip_resolved: "45.89.222.12" },
      { type: "IP Address", value: "45.89.222.12", status: "Active C2", ip_resolved: "N/A" }
    ],
    malware: [
      { name: "Emotet", type: "Downloader", risk: "Critical", first_seen: "2014-06-22" }
    ],
    attack: [
      { tactic: "Initial Access", technique_id: "T1566", technique: "Phishing: Malicious File attachment" },
      { tactic: "Execution", technique_id: "T1204", technique: "User Execution: Malicious Link click" },
      { tactic: "Collection", technique_id: "T1005", technique: "Data from Local System" }
    ],
    timeline: [
      { date: "2026-05-31", event: "Active exploitation surge detected targeting retail POS servers." },
      { date: "2025-06-10", event: "Operation Carbanak active retail compromise phase." }
    ]
  }
]

// 2. Campaigns
export const mockCampaigns: Campaign[] = [
  {
    id: "camp-ghostshell",
    name: "Operation GhostShell",
    start_date: "2026-04-01",
    status: "Active",
    threat_actor: "APT28",
    target_sector: ["Government", "Defense", "Energy"],
    region: ["Europe", "North America"],
    summary: "Cyber espionage operations targeting Eastern European defense logistics and procurement boards. Employs spearphishing with custom payloads and dynamic shifting C2 domain registrations.",
    timeline: [
      { date: "2026-06-04", event: "Detected active spearphishing mails targeting Baltic ministries." },
      { date: "2026-05-20", event: "Moved C2 operations to upgrade-microsoft-service.com." },
      { date: "2026-04-01", event: "Scouting and target profiling active on NATO logs." }
    ],
    heatmap: [
      { sector: "Government", weight: 95 },
      { sector: "Defense", weight: 90 },
      { sector: "Energy", weight: 70 },
      { sector: "Finance", weight: 15 }
    ],
    iocs: ["upgrade-microsoft-service.com", "185.123.45.67"]
  },
  {
    id: "camp-golddragon",
    name: "Operation GoldDragon",
    start_date: "2026-01-15",
    status: "Active",
    threat_actor: "Lazarus Group",
    target_sector: ["Financial Services", "Maritime Shipping", "Critical Infrastructure"],
    region: ["Asia-Pacific", "Europe"],
    summary: "Coordinated campaign targeting international logistics gateways and token trading boards to exfiltrate currency reserves and maritime tracking manifests.",
    timeline: [
      { date: "2026-06-03", event: "Successfully breached decentralized ledger trading gateway." },
      { date: "2026-03-12", event: "Spearphishing campaign targeting ports in Southeast Asia." },
      { date: "2026-01-15", event: "Reconnaissance scans logged against international cargo manifests." }
    ],
    heatmap: [
      { sector: "Finance", weight: 95 },
      { sector: "Logistics", weight: 80 },
      { sector: "Government", weight: 40 },
      { sector: "Defense", weight: 30 }
    ],
    iocs: ["1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", "secure-bank-gateway.net", "190.23.111.44"]
  },
  {
    id: "camp-carbanak",
    name: "Operation Carbanak",
    start_date: "2025-06-10",
    status: "Completed",
    threat_actor: "FIN7",
    target_sector: ["Retail", "Hospitality", "Banking"],
    region: ["North America", "Western Europe"],
    summary: "Large-scale POS network compromises targeting restaurant franchise groups and hotel hubs, stealing credit card tracks and deploying ransomware.",
    timeline: [
      { date: "2026-01-05", event: "Command servers shutdown. Campaign marked finished." },
      { date: "2025-09-14", event: "compromise of 800 POS endpoints across US department stores." },
      { date: "2025-06-10", event: "First phishing logs containing weaponized doc files." }
    ],
    heatmap: [
      { sector: "Retail", weight: 95 },
      { sector: "Hospitality", weight: 85 },
      { sector: "Finance", weight: 60 }
    ],
    iocs: ["pos-terminal-sync.com", "45.89.222.12"]
  }
]

// 3. Malware Families
export const mockMalware: MalwareFamily[] = [
  {
    id: "mal-agenttesla",
    name: "AgentTesla",
    type: "InfoStealer",
    first_seen: "2020-04-12",
    risk_level: "High",
    description: "A highly modular .NET information stealer and RAT. Capable of exfiltrating system data, keystrokes, screenshots, and credentials stored in web browsers, mail applications, and FTP clients.",
    ioc_count: 42,
    campaign_count: 8,
    associated_actors: ["APT28"],
    related_infrastructure: [
      { value: "upgrade-microsoft-service.com", type: "Domain", relation: "C2 Gateway" },
      { value: "185.123.45.67", type: "IP Address", relation: "Hosting IP" }
    ]
  },
  {
    id: "mal-trickbot",
    name: "TrickBot",
    type: "Modular RAT / Botnet",
    first_seen: "2019-10-14",
    risk_level: "High",
    description: "Highly sophisticated banking Trojan that evolved into a modular threat delivery system. Features modules for domain reconnaissance, credential harvesting, and network traversal.",
    ioc_count: 128,
    campaign_count: 12,
    associated_actors: ["Lazarus Group"],
    related_infrastructure: [
      { value: "secure-bank-gateway.net", type: "Domain", relation: "C2 Host" },
      { value: "190.23.111.44", type: "IP Address", relation: "Redirector IP" }
    ]
  },
  {
    id: "mal-emotet",
    name: "Emotet",
    type: "Downloader / Botnet Loader",
    first_seen: "2014-06-22",
    risk_level: "Critical",
    description: "Advanced malware botnet acting as a primary loader for high-impact payloads. Spreads via automated macro-enabled spam campaigns and incorporates robust anti-evasion protections.",
    ioc_count: 512,
    campaign_count: 24,
    associated_actors: ["FIN7"],
    related_infrastructure: [
      { value: "pos-terminal-sync.com", type: "Domain", relation: "C2 Sync Resolver" },
      { value: "45.89.222.12", type: "IP Address", relation: "Active Botnet Controller" }
    ]
  }
]

// 4. Indicators of Compromise (IOCs)
export const mockIOCs: IOC[] = [
  {
    id: "ioc-1",
    value: "upgrade-microsoft-service.com",
    type: "Domain",
    risk_score: 85,
    threat_level: "High",
    reputation: "Malicious",
    description: "Fake Microsoft portal domain used for credential harvesting and shell relays in Operation GhostShell.",
    tags: ["APT28", "GhostShell", "C2", "Phishing"],
    created_at: "2026-04-12T10:00:00Z"
  },
  {
    id: "ioc-2",
    value: "185.123.45.67",
    type: "IP Address",
    risk_score: 90,
    threat_level: "High",
    reputation: "Malicious",
    description: "Active C2 node resolving upgrade-microsoft-service.com in GRU campaigns.",
    tags: ["APT28", "GhostShell", "C2"],
    created_at: "2026-04-15T11:22:00Z"
  },
  {
    id: "ioc-3",
    value: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    type: "Cryptocurrency Wallet",
    risk_score: 95,
    threat_level: "Critical",
    reputation: "Malicious",
    description: "Bitcoin ledger wallet flagged for processing transfers from Lazarus ransomware campaigns.",
    tags: ["Lazarus", "GoldDragon", "Crypto", "Laundering"],
    created_at: "2026-01-20T08:14:00Z"
  },
  {
    id: "ioc-4",
    value: "secure-bank-gateway.net",
    type: "Domain",
    risk_score: 80,
    threat_level: "High",
    reputation: "Suspicious",
    description: "Spoofed SWIFT bank interface domain utilized for payload injection links in Operation GoldDragon.",
    tags: ["Lazarus", "GoldDragon", "Phishing"],
    created_at: "2026-01-18T14:45:00Z"
  },
  {
    id: "ioc-5",
    value: "190.23.111.44",
    type: "IP Address",
    risk_score: 75,
    threat_level: "Medium",
    reputation: "Suspicious",
    description: "IP resolving secure-bank-gateway.net in East Asia hosting centers.",
    tags: ["Lazarus", "GoldDragon"],
    created_at: "2026-01-19T16:00:00Z"
  },
  {
    id: "ioc-6",
    value: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    type: "SHA256 Hash",
    risk_score: 100,
    threat_level: "Critical",
    reputation: "Malicious",
    description: "Binary payload execution hash for HermitWiper ransomware variants.",
    tags: ["Lazarus", "HermitWiper", "Wiper", "Executable"],
    created_at: "2026-03-01T04:22:00Z"
  },
  {
    id: "ioc-7",
    value: "pos-terminal-sync.com",
    type: "Domain",
    risk_score: 80,
    threat_level: "High",
    reputation: "Malicious",
    description: "Exfiltration sync hub resolving POS credit card tracks in FIN7 operations.",
    tags: ["FIN7", "Carbanak", "C2", "POS"],
    created_at: "2025-06-15T09:00:00Z"
  },
  {
    id: "ioc-8",
    value: "45.89.222.12",
    type: "IP Address",
    risk_score: 85,
    threat_level: "High",
    reputation: "Malicious",
    description: "Active server endpoint hosting exfiltration nodes for Carbanak card-stealer scripts.",
    tags: ["FIN7", "Carbanak", "C2"],
    created_at: "2025-06-18T10:30:00Z"
  }
]

// 5. MITRE ATT&CK Matrix Data
export interface MitreTechnique {
  tactic: string
  technique_id: string
  name: string
  campaigns: string[]
}

export const mockMitreMatrix: MitreTechnique[] = [
  { tactic: "Initial Access", technique_id: "T1566", name: "Phishing: Spearphishing Attachment", campaigns: ["Operation GhostShell"] },
  { tactic: "Initial Access", technique_id: "T1566.002", name: "Phishing: Spearphishing Link", campaigns: ["Operation GoldDragon"] },
  { tactic: "Execution", technique_id: "T1059", name: "Command and Scripting Interpreter: PowerShell", campaigns: ["Operation GhostShell"] },
  { tactic: "Execution", technique_id: "T1204", name: "User Execution: Malicious File", campaigns: ["Operation Carbanak"] },
  { tactic: "Defense Evasion", technique_id: "T1562", name: "Impair Defenses: Disable Security Tools", campaigns: ["Operation GoldDragon"] },
  { tactic: "Defense Evasion", technique_id: "T1027", name: "Obfuscated Files or Information", campaigns: ["Operation GhostShell", "Operation Carbanak"] },
  { tactic: "Credential Access", technique_id: "T1003", name: "OS Credential Dumping: LSASS memory", campaigns: ["Operation GhostShell"] },
  { tactic: "Credential Access", technique_id: "T1555", name: "Credentials from Password Stores", campaigns: ["Operation Carbanak"] },
  { tactic: "Collection", technique_id: "T1005", name: "Data from Local System", campaigns: ["Operation GhostShell", "Operation GoldDragon", "Operation Carbanak"] },
  { tactic: "Exfiltration", technique_id: "T1048", name: "Exfiltration Over Alternative Protocol", campaigns: ["Operation GoldDragon"] }
]

// 6. Case Files (Dynamic simulation base)
export const initialCases: Case[] = [
  {
    id: "case-0042",
    case_id_str: "TL-2026-0042",
    investigator: "Special Agent J. Carter",
    priority: "Critical",
    status: "In Progress",
    summary: "Investigation into Russian GRU-affiliated spearphishing campaign targeting Baltic Defense Procurement. Identified multiple active command-and-control server nodes using Microsoft service templates.",
    notes: "Monitored IP resolves. upgrade-microsoft-service.com resolves to 185.123.45.67. Need to trace ISP subnet details.",
    created_at: "2026-06-01T08:00:00Z",
    updated_at: "2026-06-04T04:30:00Z",
    linked_entities: [
      { type: "Threat Actor", id: "actor-apt28", name: "APT28" },
      { type: "Campaign", id: "camp-ghostshell", name: "Operation GhostShell" },
      { type: "IOC", id: "ioc-1", name: "upgrade-microsoft-service.com" },
      { type: "IOC", id: "ioc-2", name: "185.123.45.67" }
    ]
  },
  {
    id: "case-0018",
    case_id_str: "TL-2026-0018",
    investigator: "Analyst S. Rogers",
    priority: "High",
    status: "Under Review",
    summary: "Lazarus Group ransomware wallet tracing and Southwest cargo terminal logistics compromises. Identified double extortion wiper components.",
    notes: "Wallet address 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa linked to multiple payment records. Monitor incoming ledger blocks.",
    created_at: "2026-05-10T11:00:00Z",
    updated_at: "2026-06-03T18:45:00Z",
    linked_entities: [
      { type: "Threat Actor", id: "actor-lazarus", name: "Lazarus Group" },
      { type: "Campaign", id: "camp-golddragon", name: "Operation GoldDragon" },
      { type: "IOC", id: "ioc-3", name: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa" }
    ]
  }
]

// 7. Graph Visualization Data (Nodes & Edges structure)
export interface GraphNode {
  id: string
  label: string
  type: "Actor" | "Campaign" | "Malware" | "Domain" | "IP" | "Hash" | "Wallet" | "Sector"
  riskScore?: number
  // Visual positions (pre-calculated layouts for default rendering)
  x: number
  y: number
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  label: string
}

export const graphNodes: GraphNode[] = [
  // Threat Actors
  { id: "APT28", label: "APT28 (Fancy Bear)", type: "Actor", x: 150, y: 150 },
  { id: "Lazarus Group", label: "Lazarus Group", type: "Actor", x: 650, y: 150 },
  { id: "FIN7", label: "FIN7 Syndicate", type: "Actor", x: 400, y: 100 },
  
  // Campaigns
  { id: "Operation GhostShell", label: "Op GhostShell", type: "Campaign", x: 100, y: 300 },
  { id: "Operation GoldDragon", label: "Op GoldDragon", type: "Campaign", x: 700, y: 300 },
  { id: "Operation Carbanak", label: "Op Carbanak", type: "Campaign", x: 400, y: 220 },
  
  // Malware Families
  { id: "AgentTesla", label: "AgentTesla RAT", type: "Malware", x: 250, y: 320 },
  { id: "TrickBot", label: "TrickBot Trojan", type: "Malware", x: 550, y: 320 },
  { id: "Emotet", label: "Emotet Botnet", type: "Malware", x: 400, y: 330 },
  
  // Domains & IPs
  { id: "upgrade-microsoft-service.com", label: "upgrade-microsoft-service.com", type: "Domain", riskScore: 85, x: 180, y: 450 },
  { id: "185.123.45.67", label: "185.123.45.67", type: "IP", riskScore: 90, x: 180, y: 560 },
  { id: "secure-bank-gateway.net", label: "secure-bank-gateway.net", type: "Domain", riskScore: 80, x: 600, y: 450 },
  { id: "190.23.111.44", label: "190.23.111.44", type: "IP", riskScore: 75, x: 600, y: 560 },
  { id: "pos-terminal-sync.com", label: "pos-terminal-sync.com", type: "Domain", riskScore: 80, x: 400, y: 460 },
  { id: "45.89.222.12", label: "45.89.222.12", type: "IP", riskScore: 85, x: 400, y: 560 },
  
  // Crypto Wallets & Hashes
  { id: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", label: "BTC Wallet (Lazarus)", type: "Wallet", riskScore: 95, x: 740, y: 460 },
  { id: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", label: "HermitWiper Hash", type: "Hash", riskScore: 100, x: 740, y: 560 },
  
  // Victim Sectors
  { id: "Government Sector", label: "Government", type: "Sector", x: 50, y: 430 },
  { id: "Defense Sector", label: "Defense Procurement", type: "Sector", x: 50, y: 520 },
  { id: "Financial Sector", label: "Financial Institutions", type: "Sector", x: 500, y: 400 },
  { id: "Logistics Sector", label: "Maritime Ports", type: "Sector", x: 800, y: 410 },
  { id: "Retail Sector", label: "Retail & POS Systems", type: "Sector", x: 300, y: 250 }
]

export const graphEdges: GraphEdge[] = [
  // Actor -> Campaign
  { id: "e1", source: "APT28", target: "Operation GhostShell", label: "LAUNCHED" },
  { id: "e2", source: "Lazarus Group", target: "Operation GoldDragon", label: "LAUNCHED" },
  { id: "e3", source: "FIN7", target: "Operation Carbanak", label: "LAUNCHED" },
  
  // Actor -> Malware
  { id: "e4", source: "APT28", target: "AgentTesla", label: "USES" },
  { id: "e5", source: "Lazarus Group", target: "TrickBot", label: "USES" },
  { id: "e6", source: "FIN7", target: "Emotet", label: "USES" },
  
  // Campaign -> Sector
  { id: "e7", source: "Operation GhostShell", target: "Government Sector", label: "TARGETS" },
  { id: "e8", source: "Operation GhostShell", target: "Defense Sector", label: "TARGETS" },
  { id: "e9", source: "Operation GoldDragon", target: "Financial Sector", label: "TARGETS" },
  { id: "e10", source: "Operation GoldDragon", target: "Logistics Sector", label: "TARGETS" },
  { id: "e11", source: "Operation Carbanak", target: "Retail Sector", label: "TARGETS" },
  
  // Malware -> Domain
  { id: "e12", source: "AgentTesla", target: "upgrade-microsoft-service.com", label: "COMMUNICATES_WITH" },
  { id: "e13", source: "TrickBot", target: "secure-bank-gateway.net", label: "COMMUNICATES_WITH" },
  { id: "e14", source: "Emotet", target: "pos-terminal-sync.com", label: "COMMUNICATES_WITH" },
  
  // Domain -> IP
  { id: "e15", source: "upgrade-microsoft-service.com", target: "185.123.45.67", label: "RESOLVES_TO" },
  { id: "e16", source: "secure-bank-gateway.net", target: "190.23.111.44", label: "RESOLVES_TO" },
  { id: "e17", source: "pos-terminal-sync.com", target: "45.89.222.12", label: "RESOLVES_TO" },
  
  // Campaign -> IOC
  { id: "e18", source: "Operation GoldDragon", target: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", label: "EXPLOITS_WITH" },
  { id: "e19", source: "Operation GoldDragon", target: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", label: "EXPLOITS_WITH" }
]
