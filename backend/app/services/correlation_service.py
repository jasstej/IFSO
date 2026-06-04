from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.models.models import IntelligenceEntity, Case, ThreatActor, Campaign
from uuid import UUID

class CorrelationService:
    @staticmethod
    def get_confidence_score(entity_type: str) -> int:
        """
        Returns a confidence score (0-100) based on threat entity types.
        Identical cryptocurrency wallets, emails, or phone numbers are high-fidelity indicators.
        Shared subnets or organizations are lower-fidelity indicators.
        """
        scores = {
            "Cryptocurrency Wallet": 95,
            "Email": 95,
            "Phone Number": 90,
            "Person of Interest": 90,
            "Domain": 85,
            "URL": 80,
            "Device": 80,
            "IP Address": 65,
            "Organization": 50,
            "UPI ID": 95
        }
        return scores.get(entity_type, 50)

    @staticmethod
    def get_correlation_reason(entity_type: str, count: int) -> str:
        """Generates a description for the correlation rationale."""
        reasons = {
            "Cryptocurrency Wallet": "Shared financial laundering or ransomware payout wallet.",
            "Email": "Identical email contact address linked across threat profiles.",
            "Phone Number": "Shared telecommunications contact trace.",
            "Person of Interest": "Same threat actor alias or person of interest identified.",
            "Domain": "Shared domain infrastructure resolver.",
            "URL": "Shared host malicious URL directory.",
            "Device": "Shared hardware identifier or workstation.",
            "IP Address": "Shared command and control IP hosting infrastructure.",
            "Organization": "Overlapping target or victim organization sector.",
            "UPI ID": "Shared banking or digital wallet transactional target."
        }
        suffix = f" Overlaps across {count} assets."
        return reasons.get(entity_type, "Shared threat intelligence entity indicator.") + suffix

    def run_correlation_engine(self, db: Session) -> List[Dict[str, Any]]:
        """
        Scans all intelligence entities and identifies any that are associated 
        with multiple cases, threat actors, or campaigns.
        """
        correlations = []
        
        # Query all entities that have relations
        entities = db.query(IntelligenceEntity).all()
        
        for entity in entities:
            # Count relations
            cases_linked = entity.cases
            actors_linked = entity.actors
            campaigns_linked = entity.campaigns
            
            total_links = len(cases_linked) + len(actors_linked) + len(campaigns_linked)
            
            # If linked to more than one distinct threat group, case, or operation, it's a correlation!
            if total_links > 1:
                cases_data = [{"id": str(c.id), "case_id_str": c.case_id_str, "investigator": c.investigator, "priority": c.priority} for c in cases_linked]
                actors_data = [{"id": str(a.id), "name": a.name, "threat_level": a.threat_level} for a in actors_linked]
                campaigns_data = [{"id": str(camp.id), "name": camp.name, "status": camp.status} for camp in campaigns_linked]
                
                confidence = self.get_confidence_score(entity.type)
                
                # Boost confidence if the entity overlaps across many cases/actors
                if total_links > 3:
                    confidence = min(confidence + 10, 100)
                    
                correlations.append({
                    "entity_id": entity.id,
                    "entity_value": entity.value,
                    "entity_type": entity.type,
                    "confidence_score": confidence,
                    "reason": self.get_correlation_reason(entity.type, total_links),
                    "cases": cases_data,
                    "actors": actors_data,
                    "campaigns": campaigns_data
                })
                
        # Sort by confidence score descending
        correlations.sort(key=lambda x: x["confidence_score"], reverse=True)
        return correlations

correlation_service = CorrelationService()
