# ThreatLens: Cyber Threat Intelligence & Investigation Platform

ThreatLens is a modern, professional, dark-themed cyber threat intelligence and forensic investigation MVP designed for law enforcement agencies, cybercrime investigation units, CERT teams, and digital forensic laboratories.

It enables investigators to collect threat indicators (IOCs), correlate intelligence via an interactive graph, build threat actor profiles, map tactics using the MITRE ATT&CK framework, and compile cases into professional intelligence briefing reports.

---

## Repository Structure

```
├── database/                   # Database schemas and cypher scripts
│   ├── postgres_schema.sql     # Relational database setup (DDL)
│   └── neo4j_queries.cypher    # Graph database node and relationship definitions
├── backend/                    # FastAPI production backend (Python)
│   └── app/
│       ├── main.py             # FastAPI router registration and entrypoint
│       ├── database.py         # SQLAlchemy engine configurations
│       ├── core/               # Settings, configuration, and JWT security keys
│       ├── models/             # Relational schema models
│       ├── schemas/            # Pydantic input/output validation schemas
│       ├── services/           # PDF ReportLab generators
│       └── routers/            # Endpoint handlers (dashboard, actors, cases, etc.)
└── frontend/                   # Next.js 15 TypeScript application
    ├── src/app/                # App router, page layouts, and style tokens
    ├── src/data/               # Integrated mock intelligence dataset
    ├── src/components/ui/      # Custom card, dialog, and tab primitives
    ├── src/components/graph/   # Draggable, searchable SVG correlation graph
    └── src/components/views/   # Modular dashboard, actor, IOC, and case views
```

---

## Getting Started

### 1. Frontend Setup & Run (Next.js 15)
The frontend contains an integrated, stateful, and interactive simulated mock database that runs fully in-browser, making it instantly ready for demonstrations without needing local databases.

Navigate to the `frontend/` directory, install packages, and launch:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

### 2. Backend Setup & Run (FastAPI)
The backend FastAPI structure is ready for production database connections. Set up a Python environment and run:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Review the API interactive Swagger documentation at [http://127.0.0.1:8000/api/docs](http://127.0.0.1:8000/api/docs).

### 3. Database Initialization
- **PostgreSQL**: Execute `database/postgres_schema.sql` inside your target database to instantiate actors, campaigns, malware, IOCs, and cases tables, along with junction relations and automatic timestamp updates.
- **Neo4j**: Run the queries in `database/neo4j_queries.cypher` inside the Neo4j browser or Cypher shell to instantiate indexes, load initial actor nodes, and establish relationships like `(Actor)-[:LAUNCHED]->(Campaign)`.

---

## Security Compliance & Protections

ThreatLens conforms to strict cyber security guidelines:
- **Input Validation**: Handled via Pydantic schemas in the backend and React types on the frontend.
- **XSS Mitigation**: Employs React JSX auto-escaping; no raw `innerHTML` injections.
- **SQLi Defenses**: All relational operations utilize parameterization through SQLAlchemy ORM.
- **Secrets Management**: Implements fallback mechanisms to prevent hardcoded credentials.
- **Safe File Serving**: PDFs are generated in-memory (`io.BytesIO()`) and served with secure headers (`Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`).