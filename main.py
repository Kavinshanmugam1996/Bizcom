from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
import io
import pandas as pd
import os
import html
from pydantic import BaseModel
from typing import List
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

app = FastAPI()

# This is necessary so your browser doesn't block the data
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Define the path to your data
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Updated to point to the Excel file we just copied
DATA_FILE = os.path.join(BASE_DIR, "data", "ONBOARDING_QUE.xlsx")
INDEX_FILE = os.path.join(BASE_DIR, "index.html")
SCRIPT_FILE = os.path.join(BASE_DIR, "Script.js")

@app.get("/")
async def read_root():
    """Serve the app with Script.js inlined so Babel can compile it."""
    if not os.path.exists(INDEX_FILE) or not os.path.exists(SCRIPT_FILE):
        return {"message": "Welcome! Please make sure index.html and Script.js exist."}
    
    with open(INDEX_FILE, "r") as f:
        html_content = f.read()
    with open(SCRIPT_FILE, "r") as f:
        script_content = f.read()
    
    # Replace the external script tag with an inline script tag
    html_content = html_content.replace(
        '<script type="text/babel" src="/Script.js"></script>',
        f'<script type="text/babel">\n{script_content}\n</script>'
    )
    # Also handle single-quoted version just in case
    html_content = html_content.replace(
        "<script type='text/babel' src='/Script.js'></script>",
        f'<script type="text/babel">\n{script_content}\n</script>'
    )
    
    from fastapi.responses import HTMLResponse
    return HTMLResponse(content=html_content)

@app.get("/Script.js")
async def read_script():
    script_path = os.path.join(BASE_DIR, "Script.js")
    if os.path.exists(script_path):
        return FileResponse(script_path)
    return {"error": "Script.js not found"}

# 2. Function to load questions
def load_questions_from_csv():
    if not os.path.exists(DATA_FILE):
        print(f"ERROR: File not found at {DATA_FILE}")
        return []
    
    # Load the Data (Excel or CSV)
    try:
        if DATA_FILE.endswith('.csv'):
            df = pd.read_csv(DATA_FILE)
        else:
            df = pd.read_excel(DATA_FILE)
            
    except Exception as e:
        print(f"Error reading data file: {e}")
        return []

    # Clean up column names (removes hidden spaces)
    df.columns = df.columns.str.strip()
    
    # Return as a list of dictionaries
    return df.to_dict(orient="records")

def create_pdf(risk_profile):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    # Title
    story.append(Paragraph("AI Risk Assessment Report", styles['Title']))
    story.append(Spacer(1, 12))

    # Score & Label
    score_text = f"Risk Score: {risk_profile['score']}% - {risk_profile['label']}"
    story.append(Paragraph(score_text, styles['Heading2']))
    story.append(Spacer(1, 12))

    # Executive Summary
    story.append(Paragraph("Executive Summary:", styles['Heading3']))
    story.append(Paragraph(risk_profile['summary'], styles['Normal']))
    story.append(Spacer(1, 12))

    # Findings
    if risk_profile['detailed_risks']:
        story.append(Paragraph("Key Findings:", styles['Heading3']))
        for risk in risk_profile['detailed_risks']:
            # Sanitize text to avoid XML parsing errors in ReportLab
            domain = html.escape(str(risk.get('domain', '')))
            finding = html.escape(str(risk.get('finding', '')))
            impact = html.escape(str(risk.get('impact', '')))
            
            text = f"<b>{domain}</b>: {finding}<br/><i>Impact: {impact}</i>"
            story.append(Paragraph(text, styles['Normal']))
            story.append(Spacer(1, 6))
        story.append(Spacer(1, 12))

    # Recommendations
    if risk_profile['recommendations']:
        story.append(Paragraph("Recommendations:", styles['Heading3']))
        # Deduplicate recommendations
        unique_recs = set(r['text'] for r in risk_profile['recommendations'])
        for rec in unique_recs:
             clean_rec = html.escape(str(rec))
             story.append(Paragraph(f"• {clean_rec}", styles['Normal']))
             story.append(Spacer(1, 6))

    doc.build(story)
    buffer.seek(0)
    return buffer

class UserResponse(BaseModel):
    question_id: str
    weight: float
    answer: str

# 3. Create an API endpoint to serve these questions
@app.get("/api/questions")
async def get_questions():
    questions = load_questions_from_csv()
    return {"count": len(questions), "data": questions}

# Endpoint for frontend compatibility if needed
@app.get("/api/load-questions")
async def get_questions_compat():
    return await get_questions()

# 4. Create an endpoint to upload Excel or CSV files
@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.filename.endswith(('.xls', '.xlsx', '.csv')):
        return {"error": "Only Excel or CSV files are allowed."}
    
    contents = await file.read()
    buffer = io.BytesIO(contents)

    if file.filename.endswith('.csv'):
        df = pd.read_csv(buffer)
    else:
        df = pd.read_excel(buffer)
    
    # Replace NaN with None so it can be handled as JSON
    df = df.where(pd.notnull(df), None)
    
    data = df.to_dict(orient="records")
    return {"filename": file.filename, "data": data, "message": "File uploaded successfully"}

# 5. Calculate Risk Score
@app.post("/api/calculate")
async def calculate_risk(responses: List[UserResponse]):
    # ... (existing calculate logic, kept for compatibility if needed) ...
    return await generate_report(responses)

# 6. Generate Detailed Report
@app.post("/api/generate-report")
async def generate_report(user_responses: List[UserResponse]):
    # Load questions to look up details
    all_questions = load_questions_from_csv()
    # Create a lookup dict for fast access: Question_ID -> Question Dict
    q_lookup = {q['Question_ID']: q for q in all_questions}
    
    risk_profile = {
        "score": 0,
        "label": "",
        "summary": "",
        "detailed_risks": [],
        "recommendations": []
    }
    
    total_score = 0
    max_possible_score = 0
    high_risk_count = 0
    
    for r in user_responses:
        # 1. Scoring Logic
        if r.answer == "Yes":
             score = 1.0
        elif r.answer == "Partial":
             score = 0.5
        else:
             score = 0.0

        total_score += score * r.weight
        max_possible_score += 1.0 * r.weight
        
        # 2. Risk Analysis Logic
        # If answer is 'No' or 'Partial', we flagging it as a risk/gap
        if r.answer == "No" or r.answer == "Partial":
            high_risk_count += 1
            
            # Lookup details from the Excel file
            q_data = q_lookup.get(r.question_id, {})
            
            # Add to Detailed Risks
            risk_profile["detailed_risks"].append({
                "question_id": r.question_id,
                "domain": q_data.get('Domain', 'Unknown'),
                "finding": q_data.get('Question_Text', 'Unknown Question'),
                "impact": q_data.get('Risk_Description', 'Risk not specified in database'),
                "user_response": r.answer
            })
            
            # Add to Recommendations
            rec = q_data.get('Recommendation', 'Implement oversight controls.')
            risk_profile["recommendations"].append({
                "domain": q_data.get('Domain', 'Unknown'),
                "text": rec
            })

    # 3. Final Calculation
    if max_possible_score == 0:
        final_percentage = 0
    else:
        final_percentage = (total_score / max_possible_score) * 100
    
    risk_profile["score"] = round(final_percentage, 2)

    # 4. Summary Generation
    if final_percentage < 30:
        risk_profile["label"] = "Low Risk"
        risk_profile["summary"] = "The organization has effective AI controls in place. Continue monitoring."
    elif final_percentage < 70:
        risk_profile["label"] = "Medium Risk"
        risk_profile["summary"] = "Several AI governance gaps exist. A roadmap for compliance should be established."
    else:
        risk_profile["label"] = "High Risk"
        risk_profile["summary"] = "CRITICAL: Significant gaps in AI Governance and Security detected. Immediate intervention required."

    # Override summary based on high risk count if needed (optional logic from user)
    if high_risk_count > 15:
         risk_profile["summary"] += " (High number of individual risk findings)."

    return risk_profile

@app.post("/api/download-report")
async def download_report(user_responses: List[UserResponse]):
    # 1. Generate the standard JSON report
    report_data = await generate_report(user_responses)
    
    # 2. Convert to PDF
    pdf_buffer = create_pdf(report_data)
    
    
    # 3. Return as a downloadable file
    pdf_buffer.seek(0)
    return StreamingResponse(
        pdf_buffer, 
        media_type='application/pdf', 
        headers={"Content-Disposition": "attachment; filename=AI_Risk_Report.pdf"}
    )

class RiskProfile(BaseModel):
    score: float
    label: str
    summary: str
    detailed_risks: List[dict] = []
    recommendations: List[dict] = []
    # Tier info from frontend
    tier: str = ""
    riskLevel: str = ""
    tagline: str = ""
    description: str = ""
    findings: List[str] = []
    actions: List[str] = []

@app.post("/api/generate-pdf-from-profile")
async def generate_pdf_from_profile(profile: RiskProfile):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    # Title
    story.append(Paragraph("AI Risk Assessment Report", styles['Title']))
    story.append(Spacer(1, 12))

    # Score & Tier
    # Use data from frontend if available, otherwise fallback
    tier_text = profile.tier if profile.tier else profile.label
    score_text = f"Risk Score: {profile.score}% - {tier_text}"
    
    story.append(Paragraph(score_text, styles['Heading2']))
    story.append(Spacer(1, 12))

    # Executive Summary
    story.append(Paragraph("Executive Summary:", styles['Heading3']))
    story.append(Paragraph(profile.description if profile.description else profile.summary, styles['Normal']))
    story.append(Spacer(1, 12))

    # Key Findings (from frontend profile)
    if profile.findings:
        story.append(Paragraph("Key Findings:", styles['Heading3']))
        for finding in profile.findings:
            text = f"• {html.escape(finding)}"
            story.append(Paragraph(text, styles['Normal']))
            story.append(Spacer(1, 6))
        story.append(Spacer(1, 12))
    elif profile.detailed_risks: # Fallback to old structure
        story.append(Paragraph("Key Findings:", styles['Heading3']))
        for risk in profile.detailed_risks:
            domain = html.escape(str(risk.get('domain', '')))
            finding = html.escape(str(risk.get('finding', '')))
            text = f"<b>{domain}</b>: {finding}"
            story.append(Paragraph(text, styles['Normal']))
            story.append(Spacer(1, 6))
        story.append(Spacer(1, 12))

    # Recommendations
    if profile.actions:
        story.append(Paragraph("Recommended Actions:", styles['Heading3']))
        for action in profile.actions:
             text = f"• {html.escape(action)}"
             story.append(Paragraph(text, styles['Normal']))
             story.append(Spacer(1, 6))
    elif profile.recommendations: # Fallback
        story.append(Paragraph("Recommendations:", styles['Heading3']))
        unique_recs = set(r['text'] for r in profile.recommendations)
        for rec in unique_recs:
             clean_rec = html.escape(str(rec))
             story.append(Paragraph(f"• {clean_rec}", styles['Normal']))
             story.append(Spacer(1, 6))

    doc.build(story)
    buffer.seek(0)
    return StreamingResponse(
        buffer, 
        media_type='application/pdf', 
        headers={"Content-Disposition": "attachment; filename=Bizcom_AI_Risk_Report.pdf"}
    )

if __name__ == "__main__":
    import uvicorn
    print("🚀 Loading AI Risk Database...")
    uvicorn.run(app, host="127.0.0.1", port=8000)