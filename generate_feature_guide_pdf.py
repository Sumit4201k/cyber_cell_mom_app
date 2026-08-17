import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY

pdf_path = os.path.join(os.getcwd(), "State_Cyber_Cell_MoM_App_Feature_Guide.pdf")

doc = SimpleDocTemplate(
    pdf_path,
    pagesize=letter,
    rightMargin=36,
    leftMargin=36,
    topMargin=36,
    bottomMargin=36
)

styles = getSampleStyleSheet()

# Custom Police Command Color Palette
PRIMARY_DARK = colors.HexColor("#0f172a") # Slate Dark
TEXT_MAIN = colors.HexColor("#1e293b")
TEXT_MUTED = colors.HexColor("#475569")
STATE_GREEN = colors.HexColor("#15803d")
STATE_AMBER = colors.HexColor("#b45309")
BORDER_COLOR = colors.HexColor("#cbd5e1")
BG_LIGHT = colors.HexColor("#f8fafc")

title_style = ParagraphStyle(
    'DocTitle',
    parent=styles['Heading1'],
    fontName='Helvetica-Bold',
    fontSize=18,
    leading=22,
    textColor=PRIMARY_DARK,
    alignment=TA_LEFT,
    spaceAfter=4
)

subtitle_style = ParagraphStyle(
    'DocSubtitle',
    parent=styles['Normal'],
    fontName='Helvetica-Bold',
    fontSize=10,
    leading=14,
    textColor=TEXT_MUTED,
    alignment=TA_LEFT,
    spaceAfter=12
)

section_heading = ParagraphStyle(
    'SectionHeading',
    parent=styles['Heading2'],
    fontName='Helvetica-Bold',
    fontSize=12,
    leading=16,
    textColor=PRIMARY_DARK,
    spaceBefore=12,
    spaceAfter=6
)

body_style = ParagraphStyle(
    'BodyDark',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=9.5,
    leading=14,
    textColor=TEXT_MAIN,
    spaceAfter=6
)

code_style = ParagraphStyle(
    'CodeSnippet',
    parent=styles['Normal'],
    fontName='Courier',
    fontSize=9,
    leading=12,
    textColor=colors.HexColor("#0f172a"),
    backColor=colors.HexColor("#f1f5f9"),
    borderPadding=6,
    spaceAfter=8
)

story = []

# --- HEADER BADGE ---
badge_header = Paragraph("<b>CONFIDENTIAL — FOR DEMONSTRATION & TECHNICAL REVIEW ONLY</b>", ParagraphStyle('Badge', fontName='Helvetica-Bold', fontSize=9, textColor=colors.HexColor("#991b1b"), backColor=colors.HexColor("#fef2f2"), borderPadding=4, spaceAfter=8))
story.append(badge_header)

# --- TITLE ---
story.append(Paragraph("STATE CYBER CELL — MOM & AUDIT LEDGER PLATFORM", title_style))
story.append(Paragraph("Complete Technical Feature Overview & Live Demonstration Guide", subtitle_style))
story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY_DARK, spaceAfter=12))

# --- SYSTEM OVERVIEW TABLE ---
overview_data = [
    [Paragraph("<b>System Name</b>", body_style), Paragraph("State Cyber Cell Minutes of Meeting (MoM) & Cryptographic Audit System", body_style)],
    [Paragraph("<b>Architecture</b>", body_style), Paragraph("Hybrid Dual-Engine: React Vite (Port 5173) + Express Node (Port 5000) + Python ML (Port 8000)", body_style)],
    [Paragraph("<b>Security & Compliance</b>", body_style), Paragraph("SHA-256 Cryptographic Hash Chain Ledger + Role-Based Access Control (RBAC)", body_style)],
    [Paragraph("<b>Deployment</b>", body_style), Paragraph("Zero-Admin Portable Python (`setup.bat` / `setup.sh`) + 1-Click Vercel Serverless Ready", body_style)]
]
t_overview = Table(overview_data, colWidths=[130, 410])
t_overview.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
    ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
    ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ('TOPPADDING', (0,0), (-1,-1), 6),
    ('BOTTOMPADDING', (0,0), (-1,-1), 6),
]))
story.append(t_overview)
story.append(Spacer(1, 10))

# --- FEATURE MATRIX ---
story.append(Paragraph("1. CORE FEATURE & CAPABILITY MATRIX", section_heading))

features = [
    ("1. Live Audio Ingestion & STT", "Accepts local audio file uploads (.wav, .mp3) OR records live via microphone. Displays a live accumulative Web Speech API transcript text stream with word counter and immediate hardware microphone track release (`stream.getTracks().forEach(t => t.stop())`)."),
    ("2. Smart AI Case Title Engine", "Semantic NLP classifier analyzes full transcript content to identify crime category (LockBit Ransomware, Deepfake Extortion, SIM Swap, Crypto Seizure, Phishing) and extracts spoken FIR/Ticket numbers (`[FIR-2026-8890]`) into authoritative titles."),
    ("3. PII Anonymization & Role Gating", "Detects sensitive entities (`FIR_ID`, `BADGE_ID`, `CYBER_TICKET`, `PHONE_NUMBER`). Interactive click-to-toggle mask/unmask pills with Auditor clearance level locking (`AUDITOR` role restricted from viewing unmasked PII)."),
    ("4. MoM Editor & Action Items Matrix", "Structured MoM generator producing Agenda Topics, Key Decisions, and Editable Action Items Matrix (Task, Owner, Deadline, Status). Direct inline case title editing (✏️) with immediate state update."),
    ("5. SHA-256 Cryptographic Audit Ledger", "Immutable audit log (`hash = SHA-256(data + prevHash)`) anchored by a Genesis block. Dual-View toggle (`📊 Human-Readable View` vs `⛓️ SHA-256 Hash Chain View`). Real-time event logging for audio play, view mode switch, PII unmask, title edit, and sign-off."),
    ("6. State Police PDF Exporter", "Generates official State Police print-ready PDF reports (`PdfReportModal.jsx`) formatted to law enforcement document standards for court submission."),
    ("7. Universal Cross-Platform Setup", "Automated setup scripts (`setup.bat` for Windows, `setup.sh` for Mac/Linux) that detect system Python or download Portable Python 3.11 with zero admin prompt required.")
]

feat_data = [[Paragraph("<b>Feature Component</b>", ParagraphStyle('Th', fontName='Helvetica-Bold', fontSize=9, textColor=PRIMARY_DARK)), Paragraph("<b>Technical Capabilities & Demonstration Behavior</b>", ParagraphStyle('Th2', fontName='Helvetica-Bold', fontSize=9, textColor=PRIMARY_DARK))]]

for title, desc in features:
    feat_data.append([
        Paragraph(f"<b>{title}</b>", ParagraphStyle('FTitle', fontName='Helvetica-Bold', fontSize=8.5, textColor=PRIMARY_DARK)),
        Paragraph(desc, body_style)
    ])

t_feat = Table(feat_data, colWidths=[150, 390])
t_feat.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#e2e8f0")),
    ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
    ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
    ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ('TOPPADDING', (0,0), (-1,-1), 5),
    ('BOTTOMPADDING', (0,0), (-1,-1), 5),
]))
story.append(t_feat)
story.append(Spacer(1, 10))

# --- PAGE 2: STEP-BY-STEP DEMO WALKTHROUGH ---
story.append(PageBreak())

story.append(Paragraph("2. STEP-BY-STEP LIVE DEMONSTRATION WALKTHROUGH", section_heading))
story.append(Paragraph("Follow these exact steps during your presentation to showcase the full end-to-end flow:", body_style))

steps = [
    ("Step 1: Launch Application", "Run `npm start` in terminal. Open browser at `http://localhost:5173/`. Point out the sharp, boxy Police Command Terminal interface."),
    ("Step 2: Dynamic Role Clearance Switch", "Use the top header dropdown to switch between **INVESTIGATOR**, **ADMIN**, and **AUDITOR**. Show how the **AUDITOR** role automatically masks raw transcripts and restricts PII unmasking."),
    ("Step 3: Live Microphone Recording & Audio Ingestion", "Click **`Process Meeting Audio`** ➔ **`Record Live via Microphone`**. Speak: <i>'Inspector Deshmukh investigating blackmail attempt via fake profile targeting victim under case FIR 2026 8890.'</i> Click **`Stop Recording & Release Mic`** ➔ **`Process Audio File`**."),
    ("Step 4: Smart AI Title & Extraction Verification", "Show how the AI instantly extracts the title: <b>`Deepfake & Cyber Extortion Threat (Targeting Student Victim) [FIR-2026-8890]`</b> and populates the Agenda, Decisions, and Action Items Matrix."),
    ("Step 5: Interactive PII Unmasking & Audit Log", "Click on the redacted PII tag `[FIR_ID: ••••••••]`. Watch it reveal `FIR-2026-8890`. Scroll down to the Audit Ledger and show how the event was cryptographically logged into the SHA-256 hash chain!"),
    ("Step 6: Cryptographic Hash Chain Verification", "Click the toggle **`⛓️ SHA-256 Hash Chain View`**. Show your friend the mathematical proof (`hash = SHA-256(data + prevHash)`) preventing any record tampering."),
    ("Step 7: Official PDF Export", "Click **`Export PDF Summary`**. Showcase the official State Police print layout formatted for court and command review.")
]

for st_title, st_desc in steps:
    story.append(Paragraph(f"<b>{st_title}</b>", ParagraphStyle('StHead', fontName='Helvetica-Bold', fontSize=9.5, textColor=PRIMARY_DARK)))
    story.append(Paragraph(st_desc, body_style))
    story.append(Spacer(1, 4))

story.append(Spacer(1, 10))
story.append(Paragraph("3. SINGLE COMMAND LAUNCH FOR ANY PC", section_heading))
story.append(Paragraph("To run on any Windows computer:", body_style))
story.append(Paragraph("setup.bat<br/>npm start", code_style))

# --- FOOTER ---
story.append(HRFlowable(width="100%", thickness=1, color=BORDER_COLOR, spaceBefore=15, spaceAfter=8))
story.append(Paragraph("<b>STATE CYBER CELL TECHNICAL INCIDENT DIVISION</b> | Official System Feature & Demonstration Guide", ParagraphStyle('Foot', fontName='Helvetica', fontSize=8, textColor=TEXT_MUTED, alignment=TA_CENTER)))

doc.build(story)
print(f"SUCCESS: Feature Guide PDF generated at {pdf_path}")
