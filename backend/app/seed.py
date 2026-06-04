from sqlalchemy.orm import Session
from datetime import date, datetime
from app.database import SessionLocal, engine
from app.models.models import (
    Base, User, Case, ThreatActor, Campaign, MalwareFamily, 
    IntelligenceEntity, MitreTechnique, CaseActivityLog, AnalystNote, NoteVersion,
    actor_malware, campaign_mitre, case_entities, actor_entities, campaign_entities
)
from app.core import security
import uuid

def seed_database():
    db = SessionLocal()
    
    # 1. Clean existing records (covered by DROP TABLE in postgres_schema_v2.sql, but safe here)
    print("Seeding ThreatLens database...")
    
    # Check if data already exists
    if db.query(User).filter(User.username == "admin").first():
        print("Database already seeded. Skipping.")
        db.close()
        return

    # 2. Add Users
    admin_user = User(
        username="admin",
        hashed_password=security.get_password_hash("secure_password123"),
        role="Admin"
    )
    investigator_user = User(
        username="investigator",
        hashed_password=security.get_password_hash("secure_password123"),
        role="Investigator"
    )
    analyst_user = User(
        username="analyst",
        hashed_password=security.get_password_hash("secure_password123"),
        role="Analyst"
    )
    db.add_all([admin_user, investigator_user, analyst_user])
    db.commit()
    print("Users created.")

    # 3. Add Threat Actors
    apt28 = ThreatActor(
        name="APT28",
        aliases=["Fancy Bear", "Sofacy", "Pawn Storm", "Sednit"],
        country="Russia",
        motivation="State-Sponsored Espionage",
        threat_level="Critical",
        confidence_rating="Certain",
        description="GRU-linked military unit 26165. Conducts cyber espionage globally since 2004 targeting government, defense, and utilities."
    )
    lazarus = ThreatActor(
        name="Lazarus Group",
        aliases=["Hidden Cobra", "Guardians of Peace", "APT38", "TEMP.Hermit"],
        country="North Korea",
        motivation="Financial Theft & State Espionage",
        threat_level="Critical",
        confidence_rating="Certain",
        description="State-sponsored threat group active since 2009. Combines destructive attacks with ransomware and multi-million dollar cryptocurrency laundering campaigns."
    )
    fin7 = ThreatActor(
        name="FIN7",
        aliases=["Carbanak Group", "Navigator Group", "ITG14"],
        country="Unknown",
        motivation="Financial Gain",
        threat_level="High",
        confidence_rating="High",
        description="Highly commercialized cybercriminal syndicate operating point-of-sale credit theft networks and ransomware campaigns since 2015."
    )
    db.add_all([apt28, lazarus, fin7])
    db.commit()
    print("Threat Actors created.")

    # 4. Add Campaigns
    ghostshell = Campaign(
        name="Operation GhostShell",
        start_date=date(2026, 4, 1),
        status="Active",
        threat_actor_id=apt28.id,
        target_sector=["Government", "Defense", "Energy"],
        region=["Europe", "North America"],
        summary="Espionage campaigns targeting defense procurement agencies in Europe using customized spearphishing implants."
    )
    golddragon = Campaign(
        name="Operation GoldDragon",
        start_date=date(2026, 1, 15),
        status="Active",
        threat_actor_id=lazarus.id,
        target_sector=["Financial Services", "Maritime Shipping", "Critical Infrastructure"],
        region=["Asia-Pacific", "Europe"],
        summary="Espionage and crypto-currency laundering operations targeting SWIFT trading boards and cargo manifolds."
    )
    carbanak = Campaign(
        name="Operation Carbanak",
        start_date=date(2025, 6, 10),
        status="Completed",
        threat_actor_id=fin7.id,
        target_sector=["Retail", "Hospitality", "Banking"],
        region=["North America", "Western Europe"],
        summary="POS network compromises targeting restaurant franchise groups and hotel hubs to steal credit cards."
    )
    db.add_all([ghostshell, golddragon, carbanak])
    db.commit()
    print("Campaigns created.")

    # 5. Add Malware Families
    agenttesla = MalwareFamily(
        name="AgentTesla",
        type="InfoStealer",
        first_seen=date(2020, 4, 12),
        risk_level="High",
        description="Modular .NET infostealer exfiltrating browser data, credentials, FTP logs, and keystrokes."
    )
    trickbot = MalwareFamily(
        name="TrickBot",
        type="Modular RAT / Botnet",
        first_seen=date(2019, 10, 14),
        risk_level="High",
        description="Sophisticated modular trojan designed to exfiltrate banking assets and deliver ransomware payloads."
    )
    emotet = MalwareFamily(
        name="Emotet",
        type="Downloader / Botnet Loader",
        first_seen=date(2014, 6, 22),
        risk_level="Critical",
        description="Advanced spam botnet serving as a primary delivery platform for high-impact malware payloads."
    )
    db.add_all([agenttesla, trickbot, emotet])
    db.commit()
    print("Malware Families created.")

    # Link Actor <-> Malware
    db.execute(actor_malware.insert().values(threat_actor_id=apt28.id, malware_id=agenttesla.id))
    db.execute(actor_malware.insert().values(threat_actor_id=lazarus.id, malware_id=trickbot.id))
    db.execute(actor_malware.insert().values(threat_actor_id=fin7.id, malware_id=emotet.id))
    db.commit()

    # 6. Add Intelligence Entities
    domain1 = IntelligenceEntity(
        value="upgrade-microsoft-service.com",
        type="Domain",
        risk_score=85,
        threat_level="High",
        description="Fake Microsoft portal used for shell relays in GRU spearphishing.",
        tags=["APT28", "GhostShell", "C2", "Phishing"]
    )
    ip1 = IntelligenceEntity(
        value="185.123.45.67",
        type="IP Address",
        risk_score=90,
        threat_level="High",
        description="Active C2 hosting node resolving upgrade-microsoft-service.com.",
        tags=["APT28", "GhostShell", "C2"]
    )
    wallet1 = IntelligenceEntity(
        value="1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
        type="Cryptocurrency Wallet",
        risk_score=95,
        threat_level="Critical",
        description="Bitcoin ledger wallet flagged for ransomware payout transfers.",
        tags=["Lazarus", "GoldDragon", "Crypto", "Laundering"]
    )
    domain2 = IntelligenceEntity(
        value="secure-bank-gateway.net",
        type="Domain",
        risk_score=80,
        threat_level="High",
        description="SWIFT gateway spoofing page used to capture logins.",
        tags=["Lazarus", "GoldDragon", "Phishing"]
    )
    ip2 = IntelligenceEntity(
        value="190.23.111.44",
        type="IP Address",
        risk_score=75,
        threat_level="Medium",
        description="Redirector IP active in East Asian subnets.",
        tags=["Lazarus", "GoldDragon"]
    )
    hash1 = IntelligenceEntity(
        value="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        type="SHA256 Hash",
        risk_score=100,
        threat_level="Critical",
        description="Binary signature matching HermitWiper execution payloads.",
        tags=["Lazarus", "HermitWiper", "Wiper"]
    )
    domain3 = IntelligenceEntity(
        value="pos-terminal-sync.com",
        type="Domain",
        risk_score=80,
        threat_level="High",
        description="Exfiltration endpoint resolver for credit cards.",
        tags=["FIN7", "Carbanak", "POS"]
    )
    ip3 = IntelligenceEntity(
        value="45.89.222.12",
        type="IP Address",
        risk_score=85,
        threat_level="High",
        description="Active controller server hosting FIN7 POS scripts.",
        tags=["FIN7", "Carbanak"]
    )
    db.add_all([domain1, ip1, wallet1, domain2, ip2, hash1, domain3, ip3])
    db.commit()
    print("Intelligence Entities created.")

    # Link Entities to Actors
    db.execute(actor_entities.insert().values(threat_actor_id=apt28.id, entity_id=domain1.id))
    db.execute(actor_entities.insert().values(threat_actor_id=apt28.id, entity_id=ip1.id))
    db.execute(actor_entities.insert().values(threat_actor_id=lazarus.id, entity_id=wallet1.id))
    db.execute(actor_entities.insert().values(threat_actor_id=lazarus.id, entity_id=domain2.id))
    db.execute(actor_entities.insert().values(threat_actor_id=lazarus.id, entity_id=ip2.id))
    db.execute(actor_entities.insert().values(threat_actor_id=lazarus.id, entity_id=hash1.id))
    db.execute(actor_entities.insert().values(threat_actor_id=fin7.id, entity_id=domain3.id))
    db.execute(actor_entities.insert().values(threat_actor_id=fin7.id, entity_id=ip3.id))

    # Link Entities to Campaigns
    db.execute(campaign_entities.insert().values(campaign_id=ghostshell.id, entity_id=domain1.id))
    db.execute(campaign_entities.insert().values(campaign_id=ghostshell.id, entity_id=ip1.id))
    db.execute(campaign_entities.insert().values(campaign_id=golddragon.id, entity_id=wallet1.id))
    db.execute(campaign_entities.insert().values(campaign_id=golddragon.id, entity_id=domain2.id))
    db.execute(campaign_entities.insert().values(campaign_id=golddragon.id, entity_id=ip2.id))
    db.execute(campaign_entities.insert().values(campaign_id=golddragon.id, entity_id=hash1.id))
    db.execute(campaign_entities.insert().values(campaign_id=carbanak.id, entity_id=domain3.id))
    db.execute(campaign_entities.insert().values(campaign_id=carbanak.id, entity_id=ip3.id))
    db.commit()

    # 7. Add MITRE ATT&CK Techniques
    t1566 = MitreTechnique(id="T1566", name="Phishing: Spearphishing Attachment", tactic="Initial Access")
    t1059 = MitreTechnique(id="T1059", name="Command and Scripting Interpreter: PowerShell", tactic="Execution")
    t1562 = MitreTechnique(id="T1562", name="Impair Defenses: Disable Security Tools", tactic="Defense Evasion")
    t1048 = MitreTechnique(id="T1048", name="Exfiltration Over Alternative Protocol", tactic="Exfiltration")
    db.add_all([t1566, t1059, t1562, t1048])
    db.commit()
    print("MITRE techniques created.")

    # Link Campaign <-> MITRE
    db.execute(campaign_mitre.insert().values(campaign_id=ghostshell.id, technique_id=t1566.id))
    db.execute(campaign_mitre.insert().values(campaign_id=ghostshell.id, technique_id=t1059.id))
    db.execute(campaign_mitre.insert().values(campaign_id=golddragon.id, technique_id=t1562.id))
    db.execute(campaign_mitre.insert().values(campaign_id=golddragon.id, technique_id=t1048.id))
    db.commit()

    # 8. Add Cases
    case1 = Case(
        case_id_str="TL-2026-0042",
        investigator="Special Agent J. Carter",
        priority="Critical",
        status="In Progress",
        summary="GRU-affiliated spearphishing campaign targeting Baltic Defense Procurement boards. Identified multiple active command-and-control server nodes resolving to Baltic subnets.",
        notes="Action item: monitor DNS resolution logs for upgrade-microsoft-service.com. Request metadata logs from ISP hosting 185.123.45.67."
    )
    case2 = Case(
        case_id_str="TL-2026-0018",
        investigator="Analyst S. Rogers",
        priority="High",
        status="Under Review",
        summary="Lazarus Group malware distribution and SWIFT payout tracking. Follow double extortion wiper payloads and ledger wallet endpoints.",
        notes="Wallet address 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa has processed over 250 BTC in the last month. Linking to GoldDragon logistics operations."
    )
    db.add_all([case1, case2])
    db.commit()
    print("Cases created.")

    # Link Cases <-> Entities
    db.execute(case_entities.insert().values(case_id=case1.id, entity_id=domain1.id))
    db.execute(case_entities.insert().values(case_id=case1.id, entity_id=ip1.id))
    db.execute(case_entities.insert().values(case_id=case2.id, entity_id=wallet1.id))
    db.execute(case_entities.insert().values(case_id=case2.id, entity_id=domain2.id))
    db.execute(case_entities.insert().values(case_id=case2.id, entity_id=ip2.id))
    db.execute(case_entities.insert().values(case_id=case2.id, entity_id=hash1.id))
    db.commit()

    # 9. Case Activity Logs
    log1 = CaseActivityLog(
        case_id=case1.id,
        activity_type="Case Created",
        description="Case file initiated by admin. Auto-assigned ID: TL-2026-0042.",
        performed_by="admin"
    )
    log2 = CaseActivityLog(
        case_id=case1.id,
        activity_type="Entity Linked",
        description="Linked intelligence entity 'upgrade-microsoft-service.com' (Domain) to case file.",
        performed_by="admin"
    )
    log3 = CaseActivityLog(
        case_id=case1.id,
        activity_type="Entity Linked",
        description="Linked intelligence entity '185.123.45.67' (IP Address) to case file.",
        performed_by="admin"
    )
    log4 = CaseActivityLog(
        case_id=case2.id,
        activity_type="Case Created",
        description="Case file initiated by admin. Auto-assigned ID: TL-2026-0018.",
        performed_by="admin"
    )
    log5 = CaseActivityLog(
        case_id=case2.id,
        activity_type="Entity Linked",
        description="Linked intelligence entity '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' (Cryptocurrency Wallet) to case file.",
        performed_by="admin"
    )
    db.add_all([log1, log2, log3, log4, log5])
    db.commit()
    
    # 10. Add Analyst Notes
    note1 = AnalystNote(
        case_id=case1.id,
        title="Infrastructure Tracking Notes",
        content="Action item: monitor DNS resolution logs for [[upgrade-microsoft-service.com]]. Request metadata logs from ISP hosting [[185.123.45.67]]. Also look for related Russian GRU alias mappings.",
        is_private=False,
        created_by="admin"
    )
    db.add(note1)
    db.commit()
    db.refresh(note1)
    
    nv1 = NoteVersion(
        note_id=note1.id,
        version=1,
        content=note1.content,
        modified_by="admin"
    )
    db.add(nv1)
    db.commit()
    
    # Link note entities manually for seed
    from app.models.models import note_entities
    db.execute(note_entities.insert().values(note_id=note1.id, entity_id=domain1.id))
    db.execute(note_entities.insert().values(note_id=note1.id, entity_id=ip1.id))
    db.commit()

    print("Database seeding completed successfully.")
    db.close()

if __name__ == "__main__":
    seed_database()
