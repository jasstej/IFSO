import io
import os
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

def generate_threat_report_pdf(data: dict) -> io.BytesIO:
    """
    Generates a professional Cyber Intelligence PDF report for a case.
    Includes Case details, Executive Summary, Actor Intelligence, Campaign Details,
    Evidence Inventory (with SHA256 hashes), Case Timeline, and Threat Risk Index.
    """
    buffer = io.BytesIO()
    
    # Page setup
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=54,
        leftMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Palette (Dark Slate/Blue)
    PRIMARY_COLOR = colors.HexColor("#0F172A")    # Deep slate
    SECONDARY_COLOR = colors.HexColor("#2563EB")  # Accent blue
    TEXT_COLOR = colors.HexColor("#334155")       # Dark gray
    BG_LIGHT = colors.HexColor("#F8FAFC")         # Very light gray
    BORDER_COLOR = colors.HexColor("#CBD5E1")     # Light gray
    
    # Custom Paragraph Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=PRIMARY_COLOR,
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=SECONDARY_COLOR,
        spaceAfter=20
    )
    
    h1_style = ParagraphStyle(
        'SectionHeader',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=PRIMARY_COLOR,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=TEXT_COLOR,
        spaceAfter=8
    )
    
    meta_label_style = ParagraphStyle(
        'MetaLabel',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=12,
        textColor=PRIMARY_COLOR
    )
    
    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )
    
    table_body_style = ParagraphStyle(
        'TableBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=TEXT_COLOR
    )
    
    table_body_mono = ParagraphStyle(
        'TableBodyMono',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=10,
        textColor=TEXT_COLOR
    )

    story = []
    
    # ----------------------------------------------------
    # Header Banner
    # ----------------------------------------------------
    story.append(Paragraph("THREATLENS INTEL BRIEFING", title_style))
    story.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | LE SENSITIVE // FOUO", subtitle_style))
    story.append(Spacer(1, 8))
    
    # Metadata block
    metadata_data = [
        [Paragraph("Case Reference:", meta_label_style), Paragraph(data.get("case_id", "N/A"), body_style),
         Paragraph("Investigator:", meta_label_style), Paragraph(data.get("investigator", "N/A"), body_style)],
        [Paragraph("Priority Level:", meta_label_style), Paragraph(data.get("priority", "N/A"), body_style),
         Paragraph("Status:", meta_label_style), Paragraph(data.get("status", "N/A"), body_style)]
    ]
    meta_table = Table(metadata_data, colWidths=[1.3*inch, 2.2*inch, 1.3*inch, 2.2*inch])
    meta_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('PADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 15))
    
    # 1. Executive Summary
    story.append(Paragraph("1. Executive Summary", h1_style))
    story.append(Paragraph(data.get("summary", "No executive summary provided."), body_style))
    
    # 2. Threat Actor Profile
    story.append(Paragraph("2. Threat Actor Profile", h1_style))
    actor = data.get("actor", {})
    if actor:
        actor_details = [
            [Paragraph("Name / Alias:", meta_label_style), Paragraph(f"{actor.get('name', 'N/A')} ({', '.join(actor.get('aliases', []))})", body_style)],
            [Paragraph("Origin:", meta_label_style), Paragraph(actor.get("country", "Unknown"), body_style)],
            [Paragraph("Motivation:", meta_label_style), Paragraph(actor.get("motivation", "N/A"), body_style)],
            [Paragraph("Threat Level:", meta_label_style), Paragraph(actor.get("threat_level", "Medium"), body_style)]
        ]
        actor_table = Table(actor_details, colWidths=[1.4*inch, 5.6*inch])
        actor_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(actor_table)
        story.append(Spacer(1, 4))
        story.append(Paragraph(f"<b>Description:</b> {actor.get('description', 'No description available.')}", body_style))
    else:
        story.append(Paragraph("No threat actor profile explicitly associated.", body_style))
        
    # 3. Campaign Overview
    story.append(Paragraph("3. Campaign Details", h1_style))
    campaign = data.get("campaign", {})
    if campaign:
        campaign_details = [
            [Paragraph("Campaign Name:", meta_label_style), Paragraph(campaign.get("name", "N/A"), body_style)],
            [Paragraph("Start Date:", meta_label_style), Paragraph(str(campaign.get("start_date", "N/A")), body_style)],
            [Paragraph("Status:", meta_label_style), Paragraph(campaign.get("status", "N/A"), body_style)],
            [Paragraph("Target Sectors:", meta_label_style), Paragraph(", ".join(campaign.get("target_sector", [])), body_style)]
        ]
        camp_table = Table(campaign_details, colWidths=[1.4*inch, 5.6*inch])
        camp_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(camp_table)
    else:
        story.append(Paragraph("No specific campaign linked to this investigation.", body_style))

    story.append(PageBreak())
    
    # 4. Evidence Inventory
    story.append(Paragraph("4. Evidence Inventory", h1_style))
    evidence_list = data.get("evidence", [])
    if evidence_list:
        ev_table_data = [[
            Paragraph("Filename", table_header_style),
            Paragraph("Size", table_header_style),
            Paragraph("SHA256 Hash", table_header_style),
            Paragraph("Uploaded By", table_header_style)
        ]]
        for ev in evidence_list:
            size_str = f"{ev.get('file_size', 0) / 1024:.1f} KB" if ev.get('file_size') else "0 KB"
            ev_table_data.append([
                Paragraph(ev.get("filename", "N/A"), table_body_style),
                Paragraph(size_str, table_body_style),
                Paragraph(ev.get("sha256_hash", "N/A"), table_body_mono),
                Paragraph(ev.get("uploaded_by", "N/A"), table_body_style)
            ])
        ev_table = Table(ev_table_data, colWidths=[2.0*inch, 0.8*inch, 3.0*inch, 1.2*inch])
        ev_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), SECONDARY_COLOR),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
            ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
            ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
            ('PADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(ev_table)
    else:
        story.append(Paragraph("No forensic evidence files cataloged in dossier.", body_style))
        
    # 5. Indicators / Entities
    story.append(Paragraph("5. Associated Indicators & Entities", h1_style))
    entities = data.get("iocs", [])
    if entities:
        ent_table_data = [[
            Paragraph("Indicator Value / Name", table_header_style),
            Paragraph("Type", table_header_style),
            Paragraph("Risk", table_header_style),
            Paragraph("Threat", table_header_style)
        ]]
        for ent in entities:
            ent_table_data.append([
                Paragraph(ent.get("value", "N/A"), table_body_style),
                Paragraph(ent.get("type", "N/A"), table_body_style),
                Paragraph(str(ent.get("risk_score", 0)), table_body_style),
                Paragraph(ent.get("threat_level", "Medium"), table_body_style)
            ])
        ent_table = Table(ent_table_data, colWidths=[3.2*inch, 1.8*inch, 0.8*inch, 1.2*inch])
        ent_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), PRIMARY_COLOR),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
            ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
            ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
            ('PADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(ent_table)
    else:
        story.append(Paragraph("No specific indicators mapped.", body_style))

    story.append(PageBreak())

    # 6. Case Activity Timeline
    story.append(Paragraph("6. Case Activity Timeline & Audits", h1_style))
    timeline_events = data.get("timeline", [])
    if timeline_events:
        t_table_data = [[
            Paragraph("Timestamp", table_header_style),
            Paragraph("Action Type", table_header_style),
            Paragraph("Log Details", table_header_style),
            Paragraph("User", table_header_style)
        ]]
        for event in timeline_events:
            ts = event.get("timestamp")
            ts_str = ts.strftime('%Y-%m-%d %H:%M') if isinstance(ts, datetime) else str(ts)[:16]
            t_table_data.append([
                Paragraph(ts_str, table_body_style),
                Paragraph(event.get("activity_type", "N/A"), table_body_style),
                Paragraph(event.get("description", "N/A"), table_body_style),
                Paragraph(event.get("performed_by", "N/A"), table_body_style)
            ])
        t_table = Table(t_table_data, colWidths=[1.2*inch, 1.4*inch, 3.4*inch, 1.0*inch])
        t_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), SECONDARY_COLOR),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
            ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
            ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
            ('PADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(t_table)
    else:
        story.append(Paragraph("No audit logs recorded for this case dossier.", body_style))

    # 7. Threat Assessment
    story.append(Paragraph("7. Threat Assessment & Risk Index", h1_style))
    risk = data.get("risk_assessment", {})
    if risk:
        story.append(Paragraph(f"<b>Overall Risk Threat Score: {risk.get('overall_score', 50)}/100 ({risk.get('overall_level', 'Medium')})</b>", meta_label_style))
        story.append(Spacer(1, 4))
        story.append(Paragraph(risk.get("rationale", "No threat score rationale provided."), body_style))
    else:
        story.append(Paragraph("Assessment pending indicator correlations.", body_style))
        
    doc.build(story)
    buffer.seek(0)
    return buffer
