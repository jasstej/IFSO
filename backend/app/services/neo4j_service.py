import logging
from typing import List, Dict, Any
from neo4j import GraphDatabase, exceptions
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.models import ThreatActor, Campaign, MalwareFamily, IntelligenceEntity, actor_malware, campaign_mitre, case_entities, actor_entities, campaign_entities, evidence_entities

logger = logging.getLogger(__name__)

class Neo4jService:
    def __init__(self):
        self.driver = None
        self.connected = False
        try:
            self.driver = GraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
            )
            # Verify connectivity
            self.driver.verify_connectivity()
            self.connected = True
            logger.info("Successfully connected to Neo4j graph database.")
        except Exception as e:
            logger.warning(f"Neo4j connection failed: {e}. Falling back to PostgreSQL relational graph generator.")
            self.connected = False

    def close(self):
        if self.driver:
            self.driver.close()

    def add_actor(self, actor_id: str, name: str, country: str, motivation: str, threat_level: str):
        if not self.connected:
            return
        query = """
        MERGE (a:ThreatActor {id: $actor_id})
        SET a.name = $name, a.country = $country, a.motivation = $motivation, a.threat_level = $threat_level
        RETURN a
        """
        try:
            with self.driver.session() as session:
                session.run(query, actor_id=str(actor_id), name=name, country=country or "Unknown", motivation=motivation, threat_level=threat_level)
        except Exception as e:
            logger.error(f"Neo4j add_actor error: {e}")

    def add_campaign(self, campaign_id: str, name: str, status: str, actor_id: str = None):
        if not self.connected:
            return
        query_camp = """
        MERGE (c:Campaign {id: $campaign_id})
        SET c.name = $name, c.status = $status
        """
        query_rel = """
        MATCH (a:ThreatActor {id: $actor_id}), (c:Campaign {id: $campaign_id})
        MERGE (a)-[:LAUNCHED]->(c)
        """
        try:
            with self.driver.session() as session:
                session.run(query_camp, campaign_id=str(campaign_id), name=name, status=status)
                if actor_id:
                    session.run(query_rel, actor_id=str(actor_id), campaign_id=str(campaign_id))
        except Exception as e:
            logger.error(f"Neo4j add_campaign error: {e}")

    def add_entity(self, entity_id: str, value: str, type_str: str, risk_score: int):
        if not self.connected:
            return
        query = """
        MERGE (e:IntelligenceEntity {id: $entity_id})
        SET e.value = $value, e.type = $type_str, e.risk_score = $risk_score
        """
        try:
            with self.driver.session() as session:
                session.run(query, entity_id=str(entity_id), value=value, type_str=type_str, risk_score=risk_score)
        except Exception as e:
            logger.error(f"Neo4j add_entity error: {e}")

    def link_entity_to_actor(self, actor_id: str, entity_id: str, label: str = "USES"):
        if not self.connected:
            return
        query = f"""
        MATCH (a:ThreatActor {{id: $actor_id}}), (e:IntelligenceEntity {{id: $entity_id}})
        MERGE (a)-[r:{label}]->(e)
        """
        try:
            with self.driver.session() as session:
                session.run(query, actor_id=str(actor_id), entity_id=str(entity_id))
        except Exception as e:
            logger.error(f"Neo4j link_entity_to_actor error: {e}")

    def get_correlation_graph(self, db: Session) -> Dict[str, List[Any]]:
        """
        Returns all nodes and edges.
        If connected to Neo4j, queries Neo4j.
        Otherwise, builds the graph dynamically from PostgreSQL models.
        """
        if self.connected:
            try:
                nodes_dict = {}
                edges = []
                query = "MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 200"
                with self.driver.session() as session:
                    result = session.run(query)
                    for record in result:
                        n = record["n"]
                        m = record["m"]
                        r = record["r"]
                        
                        # Add n node
                        n_id = n.get("id", str(n.element_id))
                        if n_id not in nodes_dict:
                            labels = list(n.labels)
                            label_str = labels[0] if labels else "Unknown"
                            nodes_dict[n_id] = {
                                "id": n_id,
                                "label": n.get("name", n.get("value", "Node")),
                                "type": label_str,
                                "riskScore": n.get("risk_score")
                            }
                            
                        # Add m node
                        m_id = m.get("id", str(m.element_id))
                        if m_id not in nodes_dict:
                            labels = list(m.labels)
                            label_str = labels[0] if labels else "Unknown"
                            nodes_dict[m_id] = {
                                "id": m_id,
                                "label": m.get("name", m.get("value", "Node")),
                                "type": label_str,
                                "riskScore": m.get("risk_score")
                            }
                            
                        edges.append({
                            "id": f"e-{r.element_id}",
                            "source": n_id,
                            "target": m_id,
                            "label": r.type
                        })
                return {"nodes": list(nodes_dict.values()), "edges": edges}
            except Exception as e:
                logger.error(f"Neo4j fetch failed: {e}. Falling back to PostgreSQL.")

        # PostgreSQL Fallback Engine: Dynamically build nodes and relationships
        nodes = []
        edges = []
        node_ids = set()

        # 1. Fetch Threat Actors
        actors = db.query(ThreatActor).all()
        for a in actors:
            node_id = f"actor-{a.id}"
            nodes.append({
                "id": node_id,
                "label": a.name,
                "type": "Actor",
                "riskScore": 90 if a.threat_level == "Critical" else 75 if a.threat_level == "High" else 50
            })
            node_ids.add(node_id)

        # 2. Fetch Campaigns
        campaigns = db.query(Campaign).all()
        for c in campaigns:
            node_id = f"campaign-{c.id}"
            nodes.append({
                "id": node_id,
                "label": c.name,
                "type": "Campaign",
                "riskScore": 75
            })
            node_ids.add(node_id)
            
            # Campaign -> Actor Link
            if c.threat_actor_id:
                actor_node_id = f"actor-{c.threat_actor_id}"
                edges.append({
                    "id": f"rel-c-a-{c.id}",
                    "source": actor_node_id,
                    "target": node_id,
                    "label": "LAUNCHED"
                })

        # 3. Fetch Malware Families
        malware = db.query(MalwareFamily).all()
        for m in malware:
            node_id = f"malware-{m.id}"
            nodes.append({
                "id": node_id,
                "label": m.name,
                "type": "Malware",
                "riskScore": 95 if m.risk_level == "Critical" else 80 if m.risk_level == "High" else 50
            })
            node_ids.add(node_id)
            
            # Actor <-> Malware Link
            for actor in m.actors:
                edges.append({
                    "id": f"rel-a-m-{actor.id}-{m.id}",
                    "source": f"actor-{actor.id}",
                    "target": node_id,
                    "label": "USES"
                })

        # 4. Fetch Intelligence Entities
        entities = db.query(IntelligenceEntity).all()
        for e in entities:
            # Map type to simplified names for frontend
            simplified_type = "Domain" if e.type == "Domain" else "IP" if e.type == "IP Address" else "Wallet" if e.type == "Cryptocurrency Wallet" else "Hash" if e.type == "SHA256 Hash" else e.type
            node_id = f"entity-{e.id}"
            nodes.append({
                "id": node_id,
                "label": e.value,
                "type": simplified_type,
                "riskScore": e.risk_score
            })
            node_ids.add(node_id)

            # Link Entities to Actors
            for actor in e.actors:
                edges.append({
                    "id": f"rel-e-act-{e.id}-{actor.id}",
                    "source": f"actor-{actor.id}",
                    "target": node_id,
                    "label": "USES"
                })
            
            # Link Entities to Campaigns
            for campaign in e.campaigns:
                edges.append({
                    "id": f"rel-e-camp-{e.id}-{campaign.id}",
                    "source": f"campaign-{campaign.id}",
                    "target": node_id,
                    "label": "EXPLOITS_WITH"
                })

        # Filter out edges that refer to non-existent nodes
        valid_edges = [edge for edge in edges if edge["source"] in node_ids and edge["target"] in node_ids]
        
        # Pre-assign coordinates (2D circle/grid layout) for SVG canvas fallback
        import math
        num_nodes = len(nodes)
        for i, node in enumerate(nodes):
            angle = i * (2 * math.pi / max(num_nodes, 1))
            radius = 180 + (i % 3) * 50
            node["x"] = 400 + radius * math.cos(angle)
            node["y"] = 300 + radius * math.sin(angle)

        return {"nodes": nodes, "edges": valid_edges}

neo4j_service = Neo4jService()
