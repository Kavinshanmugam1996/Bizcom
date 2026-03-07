from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, HTMLResponse
from fastapi.security import OAuth2PasswordBearer
from functools import lru_cache
import io
import pandas as pd
import os
import html
import re
import hashlib
import jwt
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import List, Optional
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT

app = FastAPI(title="Bizcom AI Risk Assessment API", version="2.0.0")

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── FILE PATHS ────────────────────────────────────────────────────────────────
BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
DATA_DIR    = os.path.join(BASE_DIR, "data")

QUESTIONS_FILE  = os.path.join(DATA_DIR, "questions_enriched.csv")
RISKS_FILE      = os.path.join(DATA_DIR, "master_risk_db.csv")
COMPLIANCE_FILE = os.path.join(DATA_DIR, "compliance_db.csv")
USERS_FILE      = os.path.join(DATA_DIR, "users_db.csv")

INDEX_FILE  = os.path.join(BASE_DIR, "index.html")
SCRIPT_FILE = os.path.join(BASE_DIR, "Script.js")

# ── AUTHENTICATION ────────────────────────────────────────────────────────────
SECRET_KEY = "bizcom_secret_key_123"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 24 * 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")

class LoginRequest(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        salt, key = hashed_password.split(':')
        new_key = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt.encode('utf-8'), 100000)
        return new_key.hex() == key
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_user_db():
    if not os.path.exists(USERS_FILE):
        return {}
    df = pd.read_csv(USERS_FILE)
    return {row['email']: row['hashed_password'] for _, row in df.iterrows()}

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    user_db = get_user_db()
    if email not in user_db:
        raise credentials_exception
    return email

@app.post("/api/login", response_model=Token)
def login_for_access_token(req: LoginRequest):
    user_db = get_user_db()
    user_hashed_pw = user_db.get(req.email)
    if not user_hashed_pw or not verify_password(req.password, user_hashed_pw):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": req.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# ── COMPONENT GROUPS (your 13 tags) ──────────────────────────────────────────
COMPONENT_GROUPS = [
    "Data Processing",
    "Knowledge Base",
    "Embeddings",
    "Vector Database",
    "Retrieval (RAG)",
    "Prompt Engineering",
    "LLM / Model Layer",
    "Orchestration / Agents",
    "Tools & API Integrations",
    "Application Layer",
    "Guardrails / Safety",
    "Monitoring & Evaluation",
    "Feedback & Continuous Learning",
]

# ── DB LOADERS (cached — reads file once per server run) ─────────────────────
import json

# ── HELPER: Convert DataFrames to JSON-safe dictionaries ────────────────────
def df_to_json_safe(df: pd.DataFrame) -> list:
    """Convert DataFrame to list of dicts, replacing NaN/inf with None."""
    records = []
    for _, row in df.iterrows():
        record = {}
        for col, val in row.items():
            # Replace NaN, inf, and -inf with None
            if pd.isna(val) or not pd.api.types.is_scalar(val):
                record[col] = None
            elif isinstance(val, float) and (val != val or val == float('inf') or val == float('-inf')):
                record[col] = None
            else:
                record[col] = val
        records.append(record)
    return records

@lru_cache(maxsize=1)
def load_questions() -> pd.DataFrame:
    if not os.path.exists(QUESTIONS_FILE):
        print(f"[WARN] questions_enriched.csv not found at {QUESTIONS_FILE}")
        return pd.DataFrame()
    df = pd.read_csv(QUESTIONS_FILE)
    df.columns = df.columns.str.strip()
    return df

@lru_cache(maxsize=1)
def load_risks() -> pd.DataFrame:
    if not os.path.exists(RISKS_FILE):
        print(f"[WARN] master_risk_db.csv not found at {RISKS_FILE}")
        return pd.DataFrame()
    df = pd.read_csv(RISKS_FILE, skiprows=2)
    # Strip whitespace from column names
    df.columns = df.columns.str.strip()
    # Ensure a normalized 'qid_code' column exists for reliable lookups
    if "QID Code" in df.columns:
        df["qid_code"] = df["QID Code"].astype(str)
    elif "QID_Code" in df.columns:
        df["qid_code"] = df["QID_Code"].astype(str)
    elif "qid_code" in df.columns:
        df["qid_code"] = df["qid_code"].astype(str)
    else:
        # Fallback: assume first column contains the QID value
        df["qid_code"] = df.iloc[:, 0].astype(str)

    return df

@lru_cache(maxsize=1)
def load_compliance() -> pd.DataFrame:
    if not os.path.exists(COMPLIANCE_FILE):
        print(f"[WARN] compliance_db.csv not found at {COMPLIANCE_FILE}")
        return pd.DataFrame()
    # compliance CSV may have 1 metadata/header row; try parsing with several
    # skiprows values and pick the parse that yields a QID column or AR_ values
    df = pd.DataFrame()
    for skip in (1, 2, 0):
        try:
            candidate = pd.read_csv(COMPLIANCE_FILE, skiprows=skip)
            candidate.columns = candidate.columns.str.strip()
            # If columns include a QID indicator or first column contains AR_ codes,
            # accept this parse
            cols_lower = [str(c).lower() for c in candidate.columns]
            first_col_vals = candidate.iloc[:, 0].astype(str).str.strip()
            if any("qid" in c for c in cols_lower) or first_col_vals.str.match(r'^AR_\d+').any():
                df = candidate
                break
        except Exception:
            continue

    if df.empty:
        # Fallback: try a raw read with pandas default
        df = pd.read_csv(COMPLIANCE_FILE)
        df.columns = df.columns.str.strip()

    # Normalize a 'qid_code' column for lookups
    if "QID Code" in df.columns:
        df["qid_code"] = df["QID Code"].astype(str)
    elif "QID_Code" in df.columns:
        df["qid_code"] = df["QID_Code"].astype(str)
    elif "qid_code" in df.columns:
        df["qid_code"] = df["qid_code"].astype(str)
    else:
        df["qid_code"] = df.iloc[:, 0].astype(str)

    return df

# ── FILTERING ENGINE ──────────────────────────────────────────────────────────
def filter_questions(selected_groups: List[str]) -> pd.DataFrame:
    """
    Returns questions where:
      - component_group matches ANY of the selected groups  (OR logic)
    All 122 questions are available; caller decides which groups to include.
    No universal override — filtering is purely by component_group match.
    """
    df = load_questions()
    if df.empty:
        return df
    return df[df["component_group"].isin(selected_groups)].copy()

# ── HTML SERVING ──────────────────────────────────────────────────────────────
@app.get("/")
async def read_root():
    """Serve index.html with Script.js inlined for Babel compilation."""
    if not os.path.exists(INDEX_FILE) or not os.path.exists(SCRIPT_FILE):
        return HTMLResponse(
            content="<h1>Bizcom AI Risk Assessment</h1><p>index.html or Script.js not found.</p>"
        )
    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        html_content = f.read()
    with open(SCRIPT_FILE, "r", encoding="utf-8") as f:
        script_content = f.read()

    pattern = re.compile(
        r'<script\s+type=["\']text/babel["\']\s+src=["\']/Script\.js["\']></script>',
        re.IGNORECASE,
    )
    inlined = f'<script type="text/babel">\n{script_content}\n</script>'
    match = pattern.search(html_content)
    if match:
        html_content = html_content.replace(match.group(0), inlined)
    else:
        html_content = html_content.replace("</body>", f"{inlined}\n</body>")

    return HTMLResponse(content=html_content)

@app.get("/Script.js")
async def serve_script():
    if os.path.exists(SCRIPT_FILE):
        return FileResponse(SCRIPT_FILE)
    raise HTTPException(status_code=404, detail="Script.js not found")

# ── COMPONENT GROUPS ENDPOINT ─────────────────────────────────────────────────
@app.get("/api/component-groups")
async def get_component_groups(user: str = Depends(get_current_user)):
    """Return the 13 selectable AI component groups for the inventory screen."""
    return {"count": len(COMPONENT_GROUPS), "data": COMPONENT_GROUPS}

# ── QUESTIONS ENDPOINTS ───────────────────────────────────────────────────────
@app.get("/api/questions")
async def get_all_questions(user: str = Depends(get_current_user)):
    """Return all 122 questions (unfiltered)."""
    df = load_questions()
    return {"count": len(df), "data": df_to_json_safe(df)}

@app.post("/api/questions/filtered")
async def get_filtered_questions(payload: dict, user: str = Depends(get_current_user)):
    """
    Return only questions matching the company's selected component groups.
    Body: { "selected_groups": ["LLM / Model Layer", "Vector Database", ...] }
    """
    selected = payload.get("selected_groups", [])
    if not selected:
        raise HTTPException(status_code=400, detail="selected_groups cannot be empty")

    invalid = [g for g in selected if g not in COMPONENT_GROUPS]
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid component groups: {invalid}. Valid options: {COMPONENT_GROUPS}",
        )

    filtered = filter_questions(selected)
    return {
        "selected_groups": selected,
        "total_questions": len(filtered),
        "breakdown": filtered["component_group"].value_counts().to_dict(),
        "data": df_to_json_safe(filtered),
    }

# ── RISKS ENDPOINT ────────────────────────────────────────────────────────────
@app.get("/api/risks")
async def get_all_risks(user: str = Depends(get_current_user)):
    """Return all 240 risk entries from master_risk_db."""
    df = load_risks()
    return {"count": len(df), "data": df.to_dict(orient="records")}

@app.get("/api/risks/{qid_code}")
async def get_risks_for_question(qid_code: str, user: str = Depends(get_current_user)):
    """Return all risk entries for a specific question ID (e.g. AR_51)."""
    df = load_risks()
    # Use normalized 'qid_code' column
    result = df[df["qid_code"] == qid_code]
    if result.empty:
        raise HTTPException(status_code=404, detail=f"No risks found for question {qid_code}")
    return {"qid_code": qid_code, "count": len(result), "data": result.to_dict(orient="records")}

# ── COMPLIANCE ENDPOINT ───────────────────────────────────────────────────────
@app.get("/api/compliance")
async def get_all_compliance(user: str = Depends(get_current_user)):
    """Return all 122 compliance mappings (ISO 42001, NIST RMF, OWASP, EU AI Act)."""
    df = load_compliance()
    return {"count": len(df), "data": df.to_dict(orient="records")}

@app.get("/api/compliance/{qid_code}")
async def get_compliance_for_question(qid_code: str, user: str = Depends(get_current_user)):
    """Return compliance mapping for a specific question."""
    df = load_compliance()
    # Use normalized 'qid_code' column for lookups (handles varied CSV headers)
    result = df[df["qid_code"] == qid_code]
    if result.empty:
        raise HTTPException(status_code=404, detail=f"No compliance data found for {qid_code}")
    return result.to_dict(orient="records")[0]

# ── PYDANTIC MODELS ───────────────────────────────────────────────────────────
class CompanyProfile(BaseModel):
    company_name: str
    industry: str
    company_size: str
    regulatory_region: str
    ai_maturity_level: str
    assessor_name: str
    assessor_email: str
    assessor_role: Optional[str] = ""

class AIInventoryItem(BaseModel):
    system_name: str
    description: str
    component_group: str
    vendor_or_inhouse: str
    vendor_name: Optional[str] = ""
    deployment_status: str
    data_sensitivity: str
    business_criticality: str

class UserResponse(BaseModel):
    question_id: str          # e.g. "AR_51"
    component_group: str
    answer: str               # "Yes" | "Partial" | "No" | "NA"
    weight: Optional[float] = 1.0
    max_risk_score: Optional[float] = 0.0

class AssessmentPayload(BaseModel):
    company: CompanyProfile
    inventory: List[AIInventoryItem]
    responses: List[UserResponse]

class PDFReportPayload(BaseModel):
    company: CompanyProfile
    inventory: List[AIInventoryItem]
    responses: List[UserResponse]
    score: float
    tier: str
    risk_level: str
    tagline: str
    description: str
    findings: List[str] = []
    # 'actions' (recommendations) removed per request — PDF will not include suggested actions

# ── SCORING ENGINE ────────────────────────────────────────────────────────────
def compute_ears_score(
    answer: str,
    weight: float,
    probability: float,
    impact: float,
    visibility: float,
    max_risk_score: float
) -> float:
    """
    Full EARS Framework Scoring Formula:
    Score /100 = (W × I × P × μ × e^(1−V)) / MaxRisk × 100
    
    Where:
      W = Weight (question weight)
      I = Impact (severity of impact if risks materialize)
      P = Probability (likelihood of risk)
      μ = Control Effectiveness (based on answer)
        YES     → μ = 0.05  (controls in place — low residual risk)
        PARTIAL → μ = 0.50  (partial controls)
        NO      → μ = 1.00  (no controls — full risk exposed)
      V = Visibility (organizational visibility of the risk)
      MaxRisk = Maximum possible risk score for the question
    """
    import math
    
    mu_map = {"Yes": 0.05, "Partial": 0.50, "No": 1.00}
    mu = mu_map.get(answer, None)
    if mu is None:
        return None   # NA — excluded
    
    # Ensure all parameters are floats
    w = float(weight) if weight else 1.0
    i = float(impact) if impact else 1.0
    p = float(probability) if probability else 1.0
    v = float(visibility) if visibility else 0.5
    
    # Calculate: (W × I × P × μ × e^(1−V)) / MaxRisk × 100
    numerator = w * i * p * mu * math.exp(1 - v)
    score = (numerator / max_risk_score * 100) if max_risk_score > 0 else 0
    
    return max(0, min(100, score))  # Clamp between 0-100

@app.post("/api/generate-report")
async def generate_report(payload: AssessmentPayload, user: str = Depends(get_current_user)):
    """
    Core scoring engine with TRIGGER POINT logic.
    Only "No" or "Partial" answers trigger risk and compliance assessment.
    Returns a structured risk profile with only triggered risks.
    """
    q_df = load_questions()
    r_df = load_risks()
    c_df = load_compliance()

    # Create lookup dictionaries
    q_lookup = {row["qid_code"]: row for _, row in q_df.iterrows()} if not q_df.empty else {}
    
    # Risk lookup: group by normalized 'qid_code'
    r_lookup = {}
    if not r_df.empty:
        for qid, grp in r_df.groupby("qid_code"):
            r_lookup[qid] = grp.to_dict(orient="records")
    
    # Compliance lookup: use first column (question code) as key
    c_lookup = {}
    if not c_df.empty:
        for _, row in c_df.iterrows():
            qid = str(row.get("qid_code", row.iloc[0]))
            c_lookup[qid] = row.to_dict()

    total_weighted_score = 0.0
    max_weighted_score = 0.0
    component_scores = {}
    triggered_risks = []  # Only risks from triggered questions (No/Partial)
    skipped_na = 0

    # ── SCORING PASS ──────────────────────────────────────────────────────────
    for resp in payload.responses:
        q_data = q_lookup.get(resp.question_id, {})
        weight = resp.weight or q_data.get("total_weight", 1.0) or 1.0
        max_risk = resp.max_risk_score or q_data.get("max_risk_score", 10.0) or 10.0
        group = resp.component_group or q_data.get("component_group", "Unknown")

        # Skip NA answers
        if resp.answer == "NA":
            skipped_na += 1
            continue

        # Per-component tracking (all answers)
        if group not in component_scores:
            component_scores[group] = {"earned": 0.0, "max": 0.0, "count": 0, "triggered": 0}
        component_scores[group]["count"] += 1

        # ── TRIGGER POINT LOGIC ──────────────────────────────────────────────
        # ONLY "No" or "Partial" answers trigger EARS calculation and risk assessment
        if resp.answer in ("No", "Partial"):
            component_scores[group]["triggered"] += 1
            
            # Get EARS parameters from risk data
            risks_for_q = r_lookup.get(resp.question_id, [])
            if risks_for_q:
                # Use average of all risks for this question
                probabilities = [float(r.get("P (Probability)", 1.0)) for r in risks_for_q]
                impacts = [float(r.get("I (Impact)", 1.0)) for r in risks_for_q]
                visibilities = [float(r.get("V (Visibility)", 0.5)) for r in risks_for_q]
                
                probability = sum(probabilities) / len(probabilities) if probabilities else 1.0
                impact = sum(impacts) / len(impacts) if impacts else 1.0
                visibility = sum(visibilities) / len(visibilities) if visibilities else 0.5
            else:
                # Defaults if no risk data available
                probability = 1.0
                impact = 1.0
                visibility = 0.5

            # Calculate EARS score ONLY for triggered questions
            score = compute_ears_score(resp.answer, weight, probability, impact, visibility, max_risk)
            
            if score is not None:
                total_weighted_score += score
                max_weighted_score += 1.0 * weight * max_risk
                component_scores[group]["earned"] += score
                component_scores[group]["max"] += 1.0 * weight * max_risk
            
            # Get associated compliance from compliance_db
            compliance_data = c_lookup.get(resp.question_id, {})

            # Extract compliance framework mappings robustly by matching
            # column name keywords (handles varied CSV header formats)
            comp_iso = "N/A"
            comp_nist = "N/A"
            comp_owasp = "N/A"
            comp_eu = "N/A"
            if compliance_data and isinstance(compliance_data, dict):
                for k, v in compliance_data.items():
                    try:
                        key = str(k).upper()
                    except Exception:
                        continue
                    if "ISO" in key and comp_iso == "N/A":
                        comp_iso = v
                    if "NIST" in key and comp_nist == "N/A":
                        comp_nist = v
                    if "OWASP" in key and comp_owasp == "N/A":
                        comp_owasp = v
                    if "EU" in key or "AI ACT" in key or "EU AI" in key:
                        comp_eu = v

            # Add triggered risk entry (only if score was calculated)
            if score is not None:
                triggered_risks.append({
                    "question_id": resp.question_id,
                    "component_group": group,
                    "question_text": q_data.get("question_text", "N/A"),
                    "answer": resp.answer,
                    "severity": q_data.get("severity", "Unknown"),
                    "risk_score": round(score, 2),
                    "max_risk_score": round(max_risk, 2),
                    "weight": weight,
                    
                    # Associated risks from risk database
                    "associated_risks": [
                        {
                            "risk_id": r.get("Risk ID", ""),
                            "risk_description": r.get("Risk Description", ""),
                            "probability": r.get("P (Probability)", 0),
                            "impact": r.get("I (Impact)", 0),
                            "risk_score": r.get("Risk Score /100", 0),
                        }
                        for r in risks_for_q
                    ],
                    
                    # Associated compliance breaches (robust mapping)
                    "compliance_breaches": {
                        "iso_42001": comp_iso,
                        "nist_rmf": comp_nist,
                        "owasp": comp_owasp,
                        "eu_ai_act": comp_eu,
                    } if compliance_data else {},
                })

    # ── FINAL SCORING ──────────────────────────────────────────────────────────
    if max_weighted_score == 0:
        governance_score = 0.0
    else:
        risk_exposure_pct = (total_weighted_score / max_weighted_score) * 100
        governance_score = round(100 - risk_exposure_pct, 2)

    # Per-component governance scores
    component_breakdown = {}
    for grp, data in component_scores.items():
        if data["max"] > 0:
            exposure = (data["earned"] / data["max"]) * 100
            governance = round(100 - exposure, 2)
        else:
            governance = 0.0
        component_breakdown[grp] = {
            "governance_score": governance,
            "questions_asked": data["count"],
            "trigger_points": data["triggered"],
        }

    # Sort triggered risks by severity and risk_score (worst first)
    severity_order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    triggered_risks.sort(
        key=lambda x: (
            severity_order.get(x["severity"], 999),
            -x["risk_score"]
        )
    )

    # ── BUILD SUMMARY BY COMPONENT ────────────────────────────────────────────
    triggered_summary_by_component = {}
    for trigger in triggered_risks:
        comp = trigger["component_group"]
        if comp not in triggered_summary_by_component:
            triggered_summary_by_component[comp] = []
        
        triggered_summary_by_component[comp].append({
            "question_id": trigger["question_id"],
            "question_text": trigger["question_text"],
            "answer": trigger["answer"],
            "severity": trigger["severity"],
            "risk_score": trigger["risk_score"],
            "max_risk_score": trigger["max_risk_score"],
            "weight": trigger["weight"],
            "risks": trigger["associated_risks"],
            "compliance": trigger["compliance_breaches"],
        })

    return {
        "governance_score": governance_score,
        "risk_exposure_pct": round(100 - governance_score, 2),
        "total_questions_answered": len(payload.responses) - skipped_na,
        "total_trigger_points": len(triggered_risks),
        "questions_skipped_na": skipped_na,
        "component_breakdown": component_breakdown,
        "triggered_by_component": triggered_summary_by_component,
        "triggered_risks": triggered_risks,
    }

# ── PDF BUILDER (single shared function) ─────────────────────────────────────
def build_pdf(payload: PDFReportPayload, report_data: dict) -> io.BytesIO:
    buffer = io.BytesIO()
    doc    = SimpleDocTemplate(
        buffer, pagesize=letter,
        leftMargin=0.75*inch, rightMargin=0.75*inch,
        topMargin=0.75*inch, bottomMargin=0.75*inch,
    )
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "BizcomTitle", parent=styles["Title"],
        fontSize=22, textColor=colors.HexColor("#0B1D33"),
        spaceAfter=6, fontName="Helvetica-Bold",
    )
    h2_style = ParagraphStyle(
        "BizcomH2", parent=styles["Heading2"],
        fontSize=14, textColor=colors.HexColor("#0B1D33"),
        spaceBefore=18, spaceAfter=6, fontName="Helvetica-Bold",
    )
    h3_style = ParagraphStyle(
        "BizcomH3", parent=styles["Heading3"],
        fontSize=11, textColor=colors.HexColor("#C49B2C"),
        spaceBefore=12, spaceAfter=4, fontName="Helvetica-Bold",
    )
    body_style = ParagraphStyle(
        "BizcomBody", parent=styles["Normal"],
        fontSize=10, textColor=colors.HexColor("#2A3D52"),
        spaceAfter=4, leading=15,
    )
    meta_style = ParagraphStyle(
        "BizcomMeta", parent=styles["Normal"],
        fontSize=9, textColor=colors.HexColor("#8A9BB0"),
        spaceAfter=3,
    )
    risk_style = ParagraphStyle(
        "BizcomRisk", parent=styles["Normal"],
        fontSize=9, textColor=colors.HexColor("#4A5E72"),
        spaceAfter=3, leading=14, leftIndent=12,
    )

    story = []

    # ── HEADER ────────────────────────────────────────────────────────────────
    story.append(Paragraph("Bizcom AI Risk Assessment", title_style))
    story.append(Paragraph("Confidential — Generated by Bizcom AI Governance Platform", meta_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#C49B2C"), spaceAfter=16))

    # ── COMPANY PROFILE ───────────────────────────────────────────────────────
    story.append(Paragraph("Company Profile", h2_style))
    c = payload.company
    profile_data = [
        ["Company",    c.company_name,    "Industry",   c.industry],
        ["Size",       c.company_size,    "Region",     c.regulatory_region],
        ["AI Maturity",c.ai_maturity_level,"Assessor",  f"{c.assessor_name} ({c.assessor_role})"],
    ]
    profile_table = Table(profile_data, colWidths=[1.2*inch, 2.4*inch, 1.2*inch, 2.4*inch])
    profile_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F4F6F9")),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#0B1D33")),
        ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#0B1D33")),
        ("TEXTCOLOR",  (0, 0), (0, -1), colors.HexColor("#C49B2C")),
        ("TEXTCOLOR",  (2, 0), (2, -1), colors.HexColor("#C49B2C")),
        ("FONTNAME",   (0, 0), (-1, -1), "Helvetica"),
        ("FONTNAME",   (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME",   (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE",   (0, 0), (-1, -1), 9),
        ("PADDING",    (0, 0), (-1, -1), 7),
        ("GRID",       (0, 0), (-1, -1), 0.5, colors.HexColor("#E8EDF3")),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.HexColor("#F4F6F9"), colors.white]),
    ]))
    story.append(profile_table)
    story.append(Spacer(1, 12))

    # ── AI INVENTORY ──────────────────────────────────────────────────────────
    story.append(Paragraph("AI Inventory", h2_style))
    inv_data = [["System Name", "Component Group", "Vendor/In-house", "Sensitivity", "Criticality"]]
    for item in payload.inventory:
        inv_data.append([
            html.escape(item.system_name),
            html.escape(item.component_group),
            f"{item.vendor_or_inhouse}" + (f" — {item.vendor_name}" if item.vendor_name else ""),
            item.data_sensitivity,
            item.business_criticality,
        ])
    inv_table = Table(inv_data, colWidths=[1.8*inch, 1.6*inch, 1.6*inch, 0.9*inch, 0.9*inch])
    inv_table.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, 0),  colors.HexColor("#0B1D33")),
        ("TEXTCOLOR",   (0, 0), (-1, 0),  colors.HexColor("#C49B2C")),
        ("FONTNAME",    (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTNAME",    (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE",    (0, 0), (-1, -1), 8),
        ("PADDING",     (0, 0), (-1, -1), 6),
        ("GRID",        (0, 0), (-1, -1), 0.5, colors.HexColor("#E8EDF3")),
        ("ROWBACKGROUNDS", (1, 0), (-1, -1), [colors.HexColor("#F4F6F9"), colors.white]),
        ("ALIGN",       (0, 0), (-1, -1), "LEFT"),
    ]))
    story.append(inv_table)
    story.append(Spacer(1, 12))

    # ── SCORE SUMMARY ─────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E8EDF3"), spaceAfter=12))
    story.append(Paragraph("Assessment Score Summary", h2_style))

    tier_color_map = {
        "Oversight Leader":    "#38A169",
        "Governance Mature":   "#3182CE",
        "Developing Controls": "#D69E2E",
        "Early Stage":         "#DD6B20",
        "Critical Exposure":   "#E53E3E",
    }
    tier_color = tier_color_map.get(payload.tier, "#C49B2C")

    score_data = [
        ["Governance Score", f"{payload.score:.1f} / 100",
         "Risk Tier", payload.tier],
        ["Risk Level", payload.risk_level,
         "Risk Exposure", f"{report_data.get('risk_exposure_pct', 0):.1f}%"],
        ["Questions Answered", str(report_data.get("total_questions_answered", 0)),
         "Gaps Identified", str(report_data.get("total_trigger_points", 0))],
    ]
    score_table = Table(score_data, colWidths=[1.5*inch, 2.1*inch, 1.5*inch, 2.1*inch])
    score_table.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (0, -1), colors.HexColor("#0B1D33")),
        ("BACKGROUND",  (2, 0), (2, -1), colors.HexColor("#0B1D33")),
        ("TEXTCOLOR",   (0, 0), (0, -1), colors.HexColor("#C49B2C")),
        ("TEXTCOLOR",   (2, 0), (2, -1), colors.HexColor("#C49B2C")),
        ("FONTNAME",    (0, 0), (-1, -1), "Helvetica"),
        ("FONTNAME",    (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME",    (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTNAME",    (1, 0), (1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, -1), 9),
        ("FONTSIZE",    (1, 0), (1, 0),  13),
        ("TEXTCOLOR",   (1, 0), (1, 0),  colors.HexColor(tier_color)),
        ("PADDING",     (0, 0), (-1, -1), 8),
        ("GRID",        (0, 0), (-1, -1), 0.5, colors.HexColor("#E8EDF3")),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.HexColor("#F4F6F9"), colors.white]),
    ]))
    story.append(score_table)
    story.append(Spacer(1, 8))

    # ── DESCRIPTION / EXEC SUMMARY ────────────────────────────────────────────
    story.append(Paragraph(html.escape(payload.description), body_style))
    story.append(Spacer(1, 8))

    # ── COMPONENT BREAKDOWN ───────────────────────────────────────────────────
    breakdown = report_data.get("component_breakdown", {})
    if breakdown:
        story.append(Paragraph("Component Group Breakdown", h2_style))
        bd_data = [["Component Group", "Governance Score", "Questions Asked", "Trigger Points"]]
        for grp, data in sorted(breakdown.items(), key=lambda x: x[1]["governance_score"]):
            bd_data.append([
                grp,
                f"{data['governance_score']:.1f}%",
                str(data.get("questions_asked", 0)),
                str(data.get("trigger_points", 0)),
            ])
        bd_table = Table(bd_data, colWidths=[2.8*inch, 1.5*inch, 1.2*inch, 1.2*inch])
        bd_table.setStyle(TableStyle([
            ("BACKGROUND",  (0, 0), (-1, 0),  colors.HexColor("#0B1D33")),
            ("TEXTCOLOR",   (0, 0), (-1, 0),  colors.HexColor("#C49B2C")),
            ("FONTNAME",    (0, 0), (-1, 0),  "Helvetica-Bold"),
            ("FONTNAME",    (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE",    (0, 0), (-1, -1), 9),
            ("PADDING",     (0, 0), (-1, -1), 7),
            ("GRID",        (0, 0), (-1, -1), 0.5, colors.HexColor("#E8EDF3")),
            ("ROWBACKGROUNDS", (1, 0), (-1, -1), [colors.HexColor("#F4F6F9"), colors.white]),
            ("ALIGN",       (1, 0), (-1, -1), "CENTER"),
        ]))
        story.append(bd_table)
        story.append(Spacer(1, 12))

    # ── KEY FINDINGS ──────────────────────────────────────────────────────────
    if payload.findings:
        story.append(Paragraph("Key Findings", h2_style))
        for f in payload.findings:
            story.append(Paragraph(f"• {html.escape(str(f))}", body_style))
        story.append(Spacer(1, 8))

    # ── TOP RISK GAPS ─────────────────────────────────────────────────────────
    top_risks = report_data.get("triggered_risks", [])[:10]
    if top_risks:
        story.append(Paragraph("Triggered Risks & Compliance Gaps (by Risk Score)", h2_style))
        for i, risk in enumerate(top_risks, 1):
            story.append(Paragraph(
                f"<b>{i}. [{risk['component_group']}] {html.escape(str(risk['question_text'])[:120])}</b>",
                risk_style
            ))
            story.append(Paragraph(
                f"Answer: {risk['answer']}  |  Risk Score: {risk['risk_score']}  |  Severity: {risk['severity']}",
                meta_style
            ))
            compliance = risk.get("compliance_breaches", {})
            for r in risk.get("associated_risks", []):
                risk_desc = r.get("risk_description", "")
                if risk_desc and str(risk_desc).lower() not in ["none", "nan"]:
                    story.append(Paragraph(f"<font color='#D69E2E'><b>Risk:</b></font> {html.escape(str(risk_desc))}", risk_style))
            
            if compliance.get("iso_42001") and compliance["iso_42001"] != "N/A":
                story.append(Paragraph(f"ISO 42001: {html.escape(str(compliance['iso_42001']))}", meta_style))
            if compliance.get("nist_rmf") and compliance["nist_rmf"] != "N/A":
                story.append(Paragraph(f"NIST RMF: {html.escape(str(compliance['nist_rmf']))}", meta_style))
            if compliance.get("owasp") and compliance["owasp"] != "N/A":
                story.append(Paragraph(f"OWASP: {html.escape(str(compliance['owasp']))}", meta_style))
            if compliance.get("eu_ai_act") and compliance["eu_ai_act"] != "N/A":
                story.append(Paragraph(f"EU AI Act: {html.escape(str(compliance['eu_ai_act']))}", meta_style))
            story.append(Spacer(1, 6))

    # ── RECOMMENDED ACTIONS ───────────────────────────────────────────────────
    if getattr(payload, "actions", None):
        story.append(Paragraph("Recommended Actions", h2_style))
        for i, action in enumerate(payload.actions, 1):
            story.append(Paragraph(f"{i:02d}. {html.escape(str(action))}", body_style))
        story.append(Spacer(1, 8))

    # ── FOOTER ────────────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E8EDF3"), spaceBefore=20))
    story.append(Paragraph(
        "© 2026 Bizcom – Building AI Governance Frameworks for Tomorrow. "
        "This report is confidential and intended solely for the named organisation.",
        meta_style,
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer

# ── REPORT + PDF ENDPOINTS ────────────────────────────────────────────────────
@app.post("/api/download-report")
async def download_report(payload: PDFReportPayload, user: str = Depends(get_current_user)):
    """
    Generate and download the full PDF report.
    Accepts the complete payload including company, inventory, responses, and tier info.
    """
    # Re-run scoring to get component breakdown for PDF
    assessment = AssessmentPayload(
        company=payload.company,
        inventory=payload.inventory,
        responses=payload.responses,
    )
    report_data = await generate_report(assessment)

    pdf_buffer = build_pdf(payload, report_data)
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=Bizcom_AI_Risk_Report.pdf"},
    )

# ── HEALTH CHECK ──────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    q_df = load_questions()
    r_df = load_risks()
    c_df = load_compliance()
    return {
        "status": "ok",
        "databases": {
            "questions_enriched": len(q_df),
            "master_risk_db":     len(r_df),
            "compliance_db":      len(c_df),
        },
        "component_groups": len(COMPONENT_GROUPS),
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting Bizcom AI Risk Assessment API v2.0...")
    print(f"Questions DB : {QUESTIONS_FILE}")
    print(f"Risks DB     : {RISKS_FILE}")
    print(f"Compliance DB: {COMPLIANCE_FILE}")
    uvicorn.run(app, host="127.0.0.1", port=8000)
