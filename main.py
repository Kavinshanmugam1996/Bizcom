from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from functools import lru_cache
import io
import pandas as pd
import os
import html
import re
import json
import random
import csv
import hashlib
import secrets
import jwt
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Set, Any
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Bizcom AI Risk Assessment API", version="3.0.0")

# ── CORS ──────────────────────────────────────────────────────────────────────
origins_str = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = [o.strip() for o in origins_str.split(",")] if origins_str != "*" else ["*"]
app.add_middleware(CORSMiddleware, allow_origins=allowed_origins, allow_methods=["*"], allow_headers=["*"])

# ── FILE PATHS ────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

QUESTIONS_FILE       = os.path.join(DATA_DIR, "Question.csv")
POSSIBLE_ANSWERS_FILE = os.path.join(DATA_DIR, "possible_answers.csv")
RATIONALE_FILE       = os.path.join(DATA_DIR, "rationale.csv")
CLUSTER_GROUPS_FILE  = os.path.join(DATA_DIR, "cluster_groups.csv")
QUESTION_GROUPS_FILE = os.path.join(DATA_DIR, "Question_groups.csv")
RISK_CATEGORIES_FILE = os.path.join(DATA_DIR, "risk_categories.csv")
INDUSTRIES_FILE      = os.path.join(DATA_DIR, "Industries.csv")
JURISDICTIONS_FILE   = os.path.join(DATA_DIR, "Jurisdictions.csv")
QUESTION_MAPPER_FILE = os.path.join(DATA_DIR, "AIRES_Question_Mapper_3.xlsx")
USERS_DB_FILE = os.path.join(DATA_DIR, "users_db.csv")
SYSTEM2_COHORTS_FILE = os.path.join(DATA_DIR, "system2_cohorts.json")
SYSTEM2_SELECTIONS_FILE = os.path.join(DATA_DIR, "system2_selections.json")

INDEX_FILE  = os.path.join(BASE_DIR, "index.html")
SCRIPT_FILE = os.path.join(BASE_DIR, "Script.js")
SYSTEM2_INDEX_FILE = os.path.join(BASE_DIR, "system2.html")
SYSTEM2_SCRIPT_FILE = os.path.join(BASE_DIR, "system2.js")
LOGO_FILE   = os.path.join(BASE_DIR, "logo.png")

# ── AUTH SETTINGS ────────────────────────────────────────────────────────────
JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", "24"))
SYSTEM1_PROVISION_KEY = os.getenv("SYSTEM1_PROVISION_KEY", "dev-system1-key")

# ── STATIC ASSETS ─────────────────────────────────────────────────────────────
@app.get("/logo.png")
async def get_logo():
    if os.path.exists(LOGO_FILE):
        return FileResponse(LOGO_FILE, media_type="image/png")
    raise HTTPException(status_code=404, detail="Logo not found")

# ── HELPER ────────────────────────────────────────────────────────────────────
def df_to_json_safe(df: pd.DataFrame) -> list:
    records = []
    for _, row in df.iterrows():
        record = {}
        for col, val in row.items():
            if pd.isna(val):
                record[col] = None
            elif isinstance(val, float) and (val != val or val == float('inf') or val == float('-inf')):
                record[col] = None
            else:
                record[col] = val
        records.append(record)
    return records

def hash_password(password: str, salt: Optional[str] = None) -> str:
    use_salt = salt or secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), use_salt.encode("utf-8"), 100000)
    return f"{use_salt}:{key.hex()}"

def verify_password(password: str, stored: str) -> bool:
    try:
        salt, expected = stored.split(":", 1)
    except ValueError:
        return False
    candidate = hash_password(password, salt)
    return secrets.compare_digest(candidate, f"{salt}:{expected}")

@lru_cache(maxsize=1)
def load_users_lookup() -> Dict[str, str]:
    if not os.path.exists(USERS_DB_FILE):
        return {}
    users = {}
    with open(USERS_DB_FILE, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            email = (row.get("email") or "").strip().lower()
            hashed = (row.get("hashed_password") or "").strip()
            if email and hashed:
                users[email] = hashed
    return users

def create_access_token(email: str, extra_claims: Optional[Dict[str, Any]] = None) -> str:
    expires = datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS)
    payload = {
        "sub": email,
        "exp": expires,
        "iat": datetime.utcnow(),
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(authorization: Optional[str]) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization token.")

    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    return payload

def get_current_user(authorization: Optional[str] = Header(default=None)) -> str:
    payload = decode_token(authorization)

    email = (payload.get("sub") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=401, detail="Invalid token payload.")
    return email

def read_system2_cohorts() -> Dict[str, Any]:
    if not os.path.exists(SYSTEM2_COHORTS_FILE):
        return {}
    with open(SYSTEM2_COHORTS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
        return data if isinstance(data, dict) else {}

def write_system2_cohorts(data: Dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(SYSTEM2_COHORTS_FILE), exist_ok=True)
    with open(SYSTEM2_COHORTS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def read_system2_selections() -> Dict[str, Any]:
    if not os.path.exists(SYSTEM2_SELECTIONS_FILE):
        return {}
    with open(SYSTEM2_SELECTIONS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)
        return data if isinstance(data, dict) else {}

def write_system2_selections(data: Dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(SYSTEM2_SELECTIONS_FILE), exist_ok=True)
    with open(SYSTEM2_SELECTIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def persist_system2_selection(cohort_id: str, user_role: str, user_email: str, use_cases: List[str]) -> None:
    store = read_system2_selections()
    cohort_bucket = store.setdefault(cohort_id, {
        "updated_at": "",
        "users": {
            "primary": {"email": "", "selected_use_cases": [], "updated_at": ""},
            "secondary": {"email": "", "selected_use_cases": [], "updated_at": ""},
        },
    })

    ts = datetime.utcnow().isoformat() + "Z"
    role_bucket = cohort_bucket.setdefault("users", {}).setdefault(user_role, {})
    role_bucket["email"] = user_email
    role_bucket["selected_use_cases"] = list(use_cases)
    role_bucket["updated_at"] = ts
    cohort_bucket["updated_at"] = ts
    write_system2_selections(store)

def evaluate_system2_unlock(cohort: Dict[str, Any]) -> bool:
    selections = cohort.get("selections", {})
    primary = selections.get("primary", [])
    secondary = selections.get("secondary", [])
    unlocked = bool(primary) and bool(secondary)
    cohort["survey_unlocked"] = unlocked
    if unlocked and not cohort.get("survey_link"):
        cohort["survey_link"] = f"/system2"
    return unlocked

def generate_temp_password(length: int = 12) -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$%"
    return "".join(secrets.choice(alphabet) for _ in range(length))

def get_system2_context(authorization: Optional[str] = Header(default=None)) -> Dict[str, str]:
    payload = decode_token(authorization)
    if payload.get("scope") != "system2":
        raise HTTPException(status_code=401, detail="System 2 token required.")

    email = (payload.get("sub") or "").strip().lower()
    cohort_id = (payload.get("cohort_id") or "").strip()
    user_role = (payload.get("user_role") or "").strip().lower()
    if not email or not cohort_id or user_role not in {"primary", "secondary"}:
        raise HTTPException(status_code=401, detail="Invalid System 2 token payload.")

    cohorts = read_system2_cohorts()
    cohort = cohorts.get(cohort_id)
    if not cohort:
        raise HTTPException(status_code=401, detail="Cohort not found.")

    user_record = (cohort.get("users", {}) or {}).get(user_role, {})
    if (user_record.get("email") or "").strip().lower() != email:
        raise HTTPException(status_code=401, detail="User not mapped to cohort.")

    return {"email": email, "cohort_id": cohort_id, "user_role": user_role}

# ── DB LOADERS ────────────────────────────────────────────────────────────────
def _safe_load(path, **kwargs):
    if not os.path.exists(path):
        print(f"[WARN] {os.path.basename(path)} not found at {path}")
        return pd.DataFrame()
    df = pd.read_csv(path, **kwargs)
    df.columns = df.columns.str.strip()
    return df

@lru_cache(maxsize=1)
def load_questions():
    return _safe_load(QUESTIONS_FILE)

@lru_cache(maxsize=1)
def load_possible_answers():
    return _safe_load(POSSIBLE_ANSWERS_FILE)

@lru_cache(maxsize=1)
def load_rationale():
    df = _safe_load(RATIONALE_FILE)
    if df.empty:
        return df
    # Keep only ID and Rationale columns, drop unnamed extras
    keep = [c for c in df.columns if not c.startswith("Unnamed")]
    return df[keep]

@lru_cache(maxsize=1)
def load_cluster_groups():
    return _safe_load(CLUSTER_GROUPS_FILE)

@lru_cache(maxsize=1)
def load_question_groups():
    return _safe_load(QUESTION_GROUPS_FILE)

@lru_cache(maxsize=1)
def load_risk_categories():
    return _safe_load(RISK_CATEGORIES_FILE)

@lru_cache(maxsize=1)
def load_industries():
    return _safe_load(INDUSTRIES_FILE)

@lru_cache(maxsize=1)
def load_jurisdictions():
    return _safe_load(JURISDICTIONS_FILE)

@lru_cache(maxsize=1)
def load_use_cases_from_mapper():
    """Load AI use cases (UC01..UC27) from the mapper workbook."""
    if not os.path.exists(QUESTION_MAPPER_FILE):
        return []

    try:
        use_df = pd.read_excel(QUESTION_MAPPER_FILE, sheet_name="UseCases", header=None)
    except Exception as exc:
        print(f"[WARN] Failed reading UseCases sheet: {exc}")
        return []

    out = []
    for _, row in use_df.iterrows():
        uc_id = str(row.iloc[0]).strip() if len(row) > 0 and pd.notna(row.iloc[0]) else ""
        uc_name = str(row.iloc[1]).strip() if len(row) > 1 and pd.notna(row.iloc[1]) else ""
        if re.fullmatch(r"UC\d{2}", uc_id) and uc_name:
            out.append({"id": uc_id, "name": uc_name, "label": f"{uc_id} - {uc_name}"})
    return out

@lru_cache(maxsize=1)
def load_use_case_qg_map():
    """Load mapping of use case IDs to question-group IDs from QG_UC_Matrix."""
    if not os.path.exists(QUESTION_MAPPER_FILE):
        return {}

    try:
        mdf = pd.read_excel(QUESTION_MAPPER_FILE, sheet_name="QG_UC_Matrix", header=None)
    except Exception as exc:
        print(f"[WARN] Failed reading QG_UC_Matrix sheet: {exc}")
        return {}

    header_idx = None
    qg_cols = []
    for i in range(len(mdf)):
        row_vals = [str(v).strip() for v in mdf.iloc[i].tolist()]
        if "Use Case" in row_vals and "Description" in row_vals:
            detected_qg_cols = [j for j, v in enumerate(row_vals) if re.fullmatch(r"QG\d{3}", v)]
            if detected_qg_cols:
                header_idx = i
                qg_cols = detected_qg_cols
                break

    if header_idx is None:
        return {}

    qg_headers = {j: str(mdf.iloc[header_idx, j]).strip() for j in qg_cols}
    mapping = {}
    aliases = {}

    for i in range(header_idx + 1, len(mdf)):
        raw_uc = mdf.iloc[i, 0]
        if pd.isna(raw_uc):
            continue
        uc_id = str(raw_uc).strip()
        if not re.fullmatch(r"UC\d{2}", uc_id):
            continue

        qg_set = set()
        alias_target = None
        for col_idx, qg in qg_headers.items():
            cell = mdf.iloc[i, col_idx]
            if pd.isna(cell):
                continue
            cell_str = str(cell).strip()
            alias_match = re.search(r"UC\d{2}", cell_str)
            if "->" in cell_str or "→" in cell_str:
                if alias_match:
                    alias_target = alias_match.group(0)
                continue
            if cell_str:
                qg_set.add(qg)

        if alias_target:
            aliases[uc_id] = alias_target
        mapping[uc_id] = qg_set

    for uc_id, target in aliases.items():
        mapping[uc_id] = set(mapping.get(target, set()))

    return mapping

def question_group_to_qg_code(question_group: str) -> str:
    if not question_group:
        return ""
    m = re.search(r"Question Group\s*(\d{1,3})", str(question_group), flags=re.IGNORECASE)
    if m:
        return f"QG{int(m.group(1)):03d}"
    m2 = re.search(r"QG\d{3}", str(question_group), flags=re.IGNORECASE)
    if m2:
        return m2.group(0).upper()
    return ""

@lru_cache(maxsize=1)
def build_qg_to_use_case_lookup():
    """Reverse-map QGxxx to use-case IDs for fast question tagging."""
    uc_to_qg = load_use_case_qg_map()
    reverse = {}
    for uc_id, qg_set in uc_to_qg.items():
        for qg in qg_set:
            reverse.setdefault(qg, set()).add(uc_id)
    return reverse

@lru_cache(maxsize=1)
def load_use_case_qg_mode_map() -> Dict[str, Dict[str, str]]:
    """Return mapper matrix as UC -> {QGxxx: ALL|SUB|RND}."""
    if not os.path.exists(QUESTION_MAPPER_FILE):
        return {}

    try:
        mdf = pd.read_excel(QUESTION_MAPPER_FILE, sheet_name="QG_UC_Matrix", header=None)
    except Exception as exc:
        print(f"[WARN] Failed reading QG_UC_Matrix for mode map: {exc}")
        return {}

    header_idx = None
    qg_cols = {}
    for i in range(len(mdf)):
        row_vals = [str(v).strip() for v in mdf.iloc[i].tolist()]
        if "Use Case" in row_vals and "Description" in row_vals:
            found = {j: v for j, v in enumerate(row_vals) if re.fullmatch(r"QG\d{3}", v)}
            if found:
                header_idx = i
                qg_cols = found
                break

    if header_idx is None:
        return {}

    uc_modes: Dict[str, Dict[str, str]] = {}
    aliases: Dict[str, str] = {}
    for i in range(header_idx + 1, len(mdf)):
        raw_uc = mdf.iloc[i, 0]
        if pd.isna(raw_uc):
            continue
        uc_id = str(raw_uc).strip()
        if not re.fullmatch(r"UC\d{2}", uc_id):
            continue

        row_map: Dict[str, str] = {}
        alias_target = None
        for col_idx, qg in qg_cols.items():
            cell = mdf.iloc[i, col_idx]
            if pd.isna(cell):
                continue
            token = str(cell).strip().upper()
            if not token:
                continue
            m = re.search(r"UC\d{2}", token)
            if ("->" in token or "→" in token) and m:
                alias_target = m.group(0)
                continue
            if token in {"ALL", "SUB", "RND"}:
                row_map[qg] = token

        if alias_target:
            aliases[uc_id] = alias_target
        uc_modes[uc_id] = row_map

    for uc, target in aliases.items():
        uc_modes[uc] = dict(uc_modes.get(target, {}))

    return uc_modes

@lru_cache(maxsize=1)
def load_pull_counts() -> Dict[str, Dict[str, int]]:
    """Return PullCounts rows as QGxxx -> numeric pull columns."""
    if not os.path.exists(QUESTION_MAPPER_FILE):
        return {}

    try:
        pdf = pd.read_excel(QUESTION_MAPPER_FILE, sheet_name="PullCounts", header=None)
    except Exception as exc:
        print(f"[WARN] Failed reading PullCounts: {exc}")
        return {}

    header_idx = None
    headers: List[str] = []
    for i in range(len(pdf)):
        row_vals = [str(v).strip() if pd.notna(v) else "" for v in pdf.iloc[i].tolist()]
        if "QG" in row_vals and "Block" in row_vals:
            header_idx = i
            headers = row_vals
            break

    if header_idx is None:
        return {}

    out: Dict[str, Dict[str, int]] = {}
    for i in range(header_idx + 1, len(pdf)):
        row_vals = pdf.iloc[i].tolist()
        qg = str(row_vals[0]).strip() if pd.notna(row_vals[0]) else ""
        if not re.fullmatch(r"QG\d{3}", qg):
            continue

        row_out: Dict[str, int] = {}
        block = str(row_vals[1]).strip() if len(row_vals) > 1 and pd.notna(row_vals[1]) else ""
        if block:
            row_out["Block"] = block
        for col_idx, h in enumerate(headers):
            if not h or h in {"QG", "Block"}:
                continue
            if col_idx >= len(row_vals) or pd.isna(row_vals[col_idx]):
                continue
            try:
                row_out[h] = int(float(row_vals[col_idx]))
            except Exception:
                continue

        out[qg] = row_out

    return out

def normalize_use_cases(selected: List[str]) -> List[str]:
    unique = []
    for uc in selected:
        if re.fullmatch(r"UC\d{2}", str(uc).strip()) and uc not in unique:
            unique.append(uc)
    # Mapper rule: UC26 behaves as UC19 for selection engine.
    normalized = ["UC19" if uc == "UC26" else uc for uc in unique]
    deduped = []
    for uc in sorted(normalized):
        if uc not in deduped:
            deduped.append(uc)
    return deduped

def split_target_evenly(target: int, use_cases: List[str]) -> Dict[str, int]:
    if target <= 0 or not use_cases:
        return {}
    base = target // len(use_cases)
    rem = target % len(use_cases)
    out = {uc: base for uc in sorted(use_cases)}
    for uc in sorted(use_cases)[:rem]:
        out[uc] += 1
    return out

def allocate_weighted(target: int, caps: Dict[str, int], weights: Dict[str, int]) -> Dict[str, int]:
    """Allocate integer counts by weight with cap constraints."""
    if target <= 0:
        return {k: 0 for k in caps}

    cap_total = sum(max(0, c) for c in caps.values())
    if cap_total <= target:
        return {k: max(0, c) for k, c in caps.items()}

    cleaned_weights = {k: max(0, int(weights.get(k, 0))) for k in caps}
    if sum(cleaned_weights.values()) == 0:
        cleaned_weights = {k: 1 for k in caps}

    alloc = {k: 0 for k in caps}
    raw = {}
    for k in caps:
        raw_k = target * cleaned_weights[k] / float(sum(cleaned_weights.values()))
        raw[k] = raw_k
        alloc[k] = min(max(0, caps[k]), int(raw_k))

    remaining = target - sum(alloc.values())
    if remaining <= 0:
        return alloc

    order = sorted(caps.keys(), key=lambda k: (raw[k] - int(raw[k]), cleaned_weights[k]), reverse=True)
    idx = 0
    while remaining > 0 and order:
        k = order[idx % len(order)]
        if alloc[k] < max(0, caps[k]):
            alloc[k] += 1
            remaining -= 1
        idx += 1
        if idx > len(order) * 5 and remaining > 0:
            # Final fallback pass if fractional ordering saturates.
            for kk in order:
                if remaining <= 0:
                    break
                if alloc[kk] < max(0, caps[kk]):
                    alloc[kk] += 1
                    remaining -= 1
            break

    return alloc

def select_from_qg(rng: random.Random, qg_to_qs: Dict[str, List[Dict[str, Any]]], qg: str, count: int, used: Set[str], uc_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    if count <= 0:
        return []
    pool = [q for q in qg_to_qs.get(qg, []) if q["QID"] not in used]
    if uc_filter:
        pool = [q for q in pool if uc_filter in q.get("Use_Cases", [])]
    if not pool:
        return []
    take = min(count, len(pool))
    return rng.sample(pool, take)

def build_mapper_questionnaire(selected_use_cases: List[str], seed: Optional[int] = None) -> Dict[str, Any]:
    """Build questionnaire from mapper rules: A/B shared + C per-UC random."""
    effective_ucs = normalize_use_cases(selected_use_cases)
    if "UC27" in effective_ucs:
        effective_ucs = ["UC27"]

    master = build_master_lookup()
    uc_mode_map = load_use_case_qg_mode_map()
    pull_counts = load_pull_counts()

    # Index question bank by QG code.
    qg_to_qs: Dict[str, List[Dict[str, Any]]] = {}
    for q in master.values():
        qg = question_group_to_qg_code(q.get("Question_Group", ""))
        if not qg:
            continue
        qg_to_qs.setdefault(qg, []).append(q)

    rng_seed = seed if seed is not None else abs(hash("|".join(sorted(effective_ucs)))) % (2**31)
    rng = random.Random(rng_seed)
    used_qids: Set[str] = set()
    selected: List[Dict[str, Any]] = []

    # UC27 maps to no AI: return empty selection cleanly.
    if effective_ucs == ["UC27"]:
        return {
            "questions": [],
            "meta": {
                "seed": rng_seed,
                "selected_use_cases": selected_use_cases,
                "effective_use_cases": effective_ucs,
                "totals": {"block_a": 0, "block_b": 0, "block_c": 0, "overall": 0},
            },
        }

    # Union eligibility across selected UCs.
    block_qgs = {"ALL": set(), "SUB": set(), "RND": set()}
    for uc in effective_ucs:
        for qg, mode in uc_mode_map.get(uc, {}).items():
            if mode in block_qgs:
                block_qgs[mode].add(qg)

    # System 1 targets: aligned with mapper when no industry/jur overlays selected.
    target_a = 60
    target_b = 100

    # Block A uses A pull @60 directly with cap safety.
    a_caps = {qg: len(qg_to_qs.get(qg, [])) for qg in sorted(block_qgs["ALL"])}
    a_weights = {qg: pull_counts.get(qg, {}).get("A pull @60", 1) for qg in a_caps}
    a_alloc = allocate_weighted(target_a, a_caps, a_weights)
    for qg, cnt in a_alloc.items():
        picks = select_from_qg(rng, qg_to_qs, qg, cnt, used_qids)
        for q in picks:
            used_qids.add(q["QID"])
            q2 = dict(q)
            q2["Selection_Block"] = "A"
            selected.append(q2)

    # Block B uses B pull @105 as source and scales to target 100.
    b_caps = {qg: len(qg_to_qs.get(qg, [])) for qg in sorted(block_qgs["SUB"])}
    b_weights = {qg: pull_counts.get(qg, {}).get("B pull @105", pull_counts.get(qg, {}).get("B pull @80", 1)) for qg in b_caps}
    b_alloc = allocate_weighted(target_b, b_caps, b_weights)
    for qg, cnt in b_alloc.items():
        picks = select_from_qg(rng, qg_to_qs, qg, cnt, used_qids)
        for q in picks:
            used_qids.add(q["QID"])
            q2 = dict(q)
            q2["Selection_Block"] = "B"
            selected.append(q2)

    # Block C: split 50 across selected UCs, then proportional across eligible RND QGs.
    target_c = 50
    c_uc_targets = split_target_evenly(target_c, effective_ucs)
    c_selected_count = 0
    c_breakdown = {}
    for uc in sorted(effective_ucs):
        uc_target = c_uc_targets.get(uc, 0)
        uc_qgs = sorted([qg for qg, mode in uc_mode_map.get(uc, {}).items() if mode == "RND"])
        if not uc_qgs or uc_target <= 0:
            c_breakdown[uc] = 0
            continue

        caps = {}
        weights = {}
        for qg in uc_qgs:
            available = [q for q in qg_to_qs.get(qg, []) if q["QID"] not in used_qids and uc in q.get("Use_Cases", [])]
            caps[qg] = len(available)
            weights[qg] = pull_counts.get(qg, {}).get("C pull @60", pull_counts.get(qg, {}).get("C pull @40", 1))

        alloc = allocate_weighted(uc_target, caps, weights)
        uc_count = 0
        for qg, cnt in alloc.items():
            picks = select_from_qg(rng, qg_to_qs, qg, cnt, used_qids, uc_filter=uc)
            for q in picks:
                used_qids.add(q["QID"])
                q2 = dict(q)
                q2["Selection_Block"] = "C"
                selected.append(q2)
                uc_count += 1

        # Fallback redistribution for underfill within the same UC.
        short = uc_target - uc_count
        if short > 0:
            uc_pool = []
            for qg in uc_qgs:
                uc_pool.extend([q for q in qg_to_qs.get(qg, []) if q["QID"] not in used_qids and uc in q.get("Use_Cases", [])])
            if uc_pool:
                extra_take = min(short, len(uc_pool))
                for q in rng.sample(uc_pool, extra_take):
                    used_qids.add(q["QID"])
                    q2 = dict(q)
                    q2["Selection_Block"] = "C"
                    selected.append(q2)
                    uc_count += 1

        c_breakdown[uc] = uc_count
        c_selected_count += uc_count

    # Global fallback to reach 50 C questions from any selected UC-eligible C QGs.
    if c_selected_count < target_c:
        all_c_qgs = sorted(set().union(*[
            {qg for qg, mode in uc_mode_map.get(uc, {}).items() if mode == "RND"}
            for uc in effective_ucs
        ]))
        global_pool = []
        for qg in all_c_qgs:
            global_pool.extend([q for q in qg_to_qs.get(qg, []) if q["QID"] not in used_qids])
        if global_pool:
            for q in rng.sample(global_pool, min(target_c - c_selected_count, len(global_pool))):
                used_qids.add(q["QID"])
                q2 = dict(q)
                q2["Selection_Block"] = "C"
                selected.append(q2)
                c_selected_count += 1

    return {
        "questions": selected,
        "meta": {
            "seed": rng_seed,
            "selected_use_cases": selected_use_cases,
            "effective_use_cases": effective_ucs,
            "totals": {
                "block_a": len([q for q in selected if q.get("Selection_Block") == "A"]),
                "block_b": len([q for q in selected if q.get("Selection_Block") == "B"]),
                "block_c": len([q for q in selected if q.get("Selection_Block") == "C"]),
                "overall": len(selected),
            },
            "block_c_per_uc": c_breakdown,
        },
    }

# ── MASTER LOOKUP (merges all tables by QID) ──────────────────────────────────
@lru_cache(maxsize=1)
def build_master_lookup():
    """Build a dict keyed by QID with all merged metadata."""
    q_df = load_questions()
    if q_df.empty:
        return {}

    ans_df = load_possible_answers()
    rat_df = load_rationale()
    clu_df = load_cluster_groups()
    qg_df  = load_question_groups()
    rc_df  = load_risk_categories()
    ind_df = load_industries()
    jur_df = load_jurisdictions()
    qg_to_uc = build_qg_to_use_case_lookup()

    # Build answer lookup: QID -> list of {Option_Order, Answer_Option}
    ans_lookup = {}
    if not ans_df.empty:
        for qid, grp in ans_df.groupby("QID"):
            ans_lookup[qid] = grp.sort_values("Option_Order")[["Option_Order", "Answer_Option"]].to_dict("records")

    # Build rationale lookup: ID -> text
    rat_lookup = {}
    if not rat_df.empty:
        rat_col = [c for c in rat_df.columns if "rationale" in c.lower() or "explanation" in c.lower()]
        rat_text_col = rat_col[0] if rat_col else rat_df.columns[1] if len(rat_df.columns) > 1 else None
        if rat_text_col:
            for _, row in rat_df.iterrows():
                rat_lookup[str(row.iloc[0])] = str(row[rat_text_col]) if pd.notna(row[rat_text_col]) else ""

    # Build cluster lookup: QID -> cluster
    clu_lookup = {}
    if not clu_df.empty:
        for _, row in clu_df.iterrows():
            clu_lookup[row["QID"]] = row["Cluster_Group"]

    # Build question group lookup: QID -> group
    qg_lookup = {}
    if not qg_df.empty:
        for _, row in qg_df.iterrows():
            qg_lookup[row["QID"]] = row["Question_Group"]

    # Build risk category lookup: QID -> category
    rc_lookup = {}
    if not rc_df.empty:
        for _, row in rc_df.iterrows():
            rc_lookup[row["QID"]] = row["Risk_Category"]

    # Build industry lookup: QID -> list of Industry
    ind_lookup = {}
    if not ind_df.empty:
        for qid, grp in ind_df.groupby("QID"):
            ind_lookup[qid] = grp["Industry"].dropna().unique().tolist()

    # Build jurisdiction lookup: QID -> list of Jurisdiction
    jur_lookup = {}
    if not jur_df.empty:
        for qid, grp in jur_df.groupby("QID"):
            jur_lookup[qid] = grp["Jurisdiction"].dropna().unique().tolist()

    # Build master dict
    master = {}
    for _, row in q_df.iterrows():
        qid = row["QID"]
        master[qid] = {
            "QID": qid,
            "Question_Text": row.get("Question_Text", ""),
            "Source_Sheet": row.get("Source_Sheet", ""),
            "Cluster_Group": clu_lookup.get(qid, "Uncategorized"),
            "Question_Group": qg_lookup.get(qid, ""),
            "Risk_Category": rc_lookup.get(qid, ""),
            "Rationale": rat_lookup.get(qid, ""),
            "Answers": ans_lookup.get(qid, []),
            "Industries": ind_lookup.get(qid, ["All Industries"]),
            "Jurisdictions": jur_lookup.get(qid, ["All Jurisdictions"]),
            "Use_Cases": sorted(list(qg_to_uc.get(question_group_to_qg_code(qg_lookup.get(qid, "")), set()))),
        }
    return master

def get_cluster_list():
    """Return sorted unique cluster names."""
    clu_df = load_cluster_groups()
    if clu_df.empty:
        return []
    return sorted(clu_df["Cluster_Group"].dropna().unique().tolist())

# ── HTML SERVING ──────────────────────────────────────────────────────────────
@app.get("/")
async def read_root():
    if not os.path.exists(INDEX_FILE) or not os.path.exists(SCRIPT_FILE):
        return HTMLResponse(content="<h1>Bizcom AI Risk Assessment</h1><p>index.html or Script.js not found.</p>")
    with open(INDEX_FILE, "r", encoding="utf-8") as f:
        html_content = f.read()
    with open(SCRIPT_FILE, "r", encoding="utf-8") as f:
        script_content = f.read()
    pattern = re.compile(r'<script\s+type=["\']text/babel["\']\s+src=["\']/?Script\.js["\']></script>', re.IGNORECASE)
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

@app.get("/system2")
async def read_system2_root():
    if not os.path.exists(SYSTEM2_INDEX_FILE) or not os.path.exists(SYSTEM2_SCRIPT_FILE):
        return HTMLResponse(content="<h1>System 2</h1><p>system2.html or system2.js not found.</p>")
    with open(SYSTEM2_INDEX_FILE, "r", encoding="utf-8") as f:
        html_content = f.read()
    with open(SYSTEM2_SCRIPT_FILE, "r", encoding="utf-8") as f:
        script_content = f.read()
    pattern = re.compile(r'<script\s+type=["\']text/babel["\']\s+src=["\']/?system2\.js["\']></script>', re.IGNORECASE)
    inlined = f'<script type="text/babel">\n{script_content}\n</script>'
    match = pattern.search(html_content)
    if match:
        html_content = html_content.replace(match.group(0), inlined)
    else:
        html_content = html_content.replace("</body>", f"{inlined}\n</body>")
    return HTMLResponse(content=html_content)

@app.get("/system2.js")
async def serve_system2_script():
    if os.path.exists(SYSTEM2_SCRIPT_FILE):
        return FileResponse(SYSTEM2_SCRIPT_FILE)
    raise HTTPException(status_code=404, detail="system2.js not found")

class LoginRequest(BaseModel):
    email: str = Field(..., max_length=200)
    password: str = Field(..., max_length=200)

@app.post("/api/login")
async def login(payload: LoginRequest):
    users = load_users_lookup()
    if not users:
        raise HTTPException(status_code=500, detail="User database not found. Create data/users_db.csv first.")

    email = payload.email.strip().lower()
    stored_hash = users.get(email)
    if not stored_hash or not verify_password(payload.password, stored_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token(email)
    return {"access_token": token, "token_type": "bearer", "email": email}

class System2UseCaseSelectionPayload(BaseModel):
    ai_use_cases: List[str] = Field(default_factory=list)

class System2ProvisionPayload(BaseModel):
    cohort_id: str = Field(..., max_length=120)
    company_name: str = Field(..., max_length=200)
    primary_email: str = Field(..., max_length=200)
    secondary_email: str = Field(..., max_length=200)
    primary_name: Optional[str] = Field(default="", max_length=150)
    secondary_name: Optional[str] = Field(default="", max_length=150)
    payment_reference: Optional[str] = Field(default="", max_length=150)

@app.post("/api/system2/provision")
async def system2_provision_from_system1(
    payload: System2ProvisionPayload,
    x_system1_key: Optional[str] = Header(default=None),
):
    if x_system1_key != SYSTEM1_PROVISION_KEY:
        raise HTTPException(status_code=401, detail="Invalid System 1 provision key.")

    primary_email = payload.primary_email.strip().lower()
    secondary_email = payload.secondary_email.strip().lower()
    if not primary_email or not secondary_email:
        raise HTTPException(status_code=400, detail="Both primary and secondary email are required.")
    if primary_email == secondary_email:
        raise HTTPException(status_code=400, detail="Primary and secondary emails must be different.")

    primary_password = generate_temp_password()
    secondary_password = generate_temp_password()

    cohorts = read_system2_cohorts()
    cohort = cohorts.get(payload.cohort_id, {})

    cohort["company_name"] = payload.company_name.strip()
    cohort["payment_reference"] = (payload.payment_reference or "").strip()
    cohort["created_at"] = cohort.get("created_at", datetime.utcnow().isoformat() + "Z")
    cohort["provisioned_at"] = datetime.utcnow().isoformat() + "Z"
    cohort["users"] = {
        "primary": {
            "email": primary_email,
            "name": (payload.primary_name or "").strip(),
            "hashed_password": hash_password(primary_password),
        },
        "secondary": {
            "email": secondary_email,
            "name": (payload.secondary_name or "").strip(),
            "hashed_password": hash_password(secondary_password),
        },
    }
    cohort["selections"] = {"primary": [], "secondary": []}
    cohort["survey_unlocked"] = False
    cohort["survey_link"] = ""

    cohorts[payload.cohort_id] = cohort
    write_system2_cohorts(cohorts)

    return {
        "cohort_id": payload.cohort_id,
        "portal_url": "/system2",
        "users": {
            "primary": {
                "email": primary_email,
                "password": primary_password,
            },
            "secondary": {
                "email": secondary_email,
                "password": secondary_password,
            },
        },
        "message": "System 2 users provisioned from System 1 webform data.",
    }

@app.post("/api/system2/login")
async def system2_login(payload: LoginRequest):
    cohorts = read_system2_cohorts()
    email = payload.email.strip().lower()

    for cohort_id, cohort in cohorts.items():
        users = cohort.get("users", {})
        for role in ("primary", "secondary"):
            user = users.get(role, {})
            if (user.get("email") or "").strip().lower() != email:
                continue
            if not verify_password(payload.password, user.get("hashed_password", "")):
                raise HTTPException(status_code=401, detail="Invalid email or password.")

            token = create_access_token(email, {
                "scope": "system2",
                "cohort_id": cohort_id,
                "user_role": role,
            })
            return {
                "access_token": token,
                "token_type": "bearer",
                "email": email,
                "cohort_id": cohort_id,
                "user_role": role,
            }

    raise HTTPException(status_code=401, detail="Invalid email or password.")

@app.get("/api/system2/me")
async def system2_me(ctx: Dict[str, str] = Depends(get_system2_context)):
    cohorts = read_system2_cohorts()
    cohort = cohorts.get(ctx["cohort_id"], {})
    evaluate_system2_unlock(cohort)
    write_system2_cohorts(cohorts)

    selections = cohort.get("selections", {})
    my_selection = selections.get(ctx["user_role"], [])
    other_role = "secondary" if ctx["user_role"] == "primary" else "primary"
    other_done = bool(selections.get(other_role, []))

    return {
        "email": ctx["email"],
        "cohort_id": ctx["cohort_id"],
        "user_role": ctx["user_role"],
        "my_use_cases": my_selection,
        "my_selection_done": bool(my_selection),
        "other_selection_done": other_done,
        "survey_unlocked": bool(cohort.get("survey_unlocked", False)),
        "survey_link": cohort.get("survey_link", "/system2"),
    }

@app.post("/api/system2/select-use-cases")
async def system2_select_use_cases(payload: System2UseCaseSelectionPayload, ctx: Dict[str, str] = Depends(get_system2_context)):
    use_cases = sorted(set([uc.strip() for uc in payload.ai_use_cases if str(uc).strip()]))
    if len(use_cases) < 1 or len(use_cases) > 5:
        raise HTTPException(status_code=400, detail="Select a minimum of 1 and a maximum of 5 AI use cases.")
    if "UC27" in use_cases and len(use_cases) > 1:
        raise HTTPException(status_code=400, detail="UC27 (No AI) must be selected alone.")

    cohorts = read_system2_cohorts()
    cohort = cohorts.get(ctx["cohort_id"], {})
    selections = cohort.setdefault("selections", {})
    selections[ctx["user_role"]] = use_cases
    persist_system2_selection(ctx["cohort_id"], ctx["user_role"], ctx["email"], use_cases)
    unlocked = evaluate_system2_unlock(cohort)
    write_system2_cohorts(cohorts)

    return {
        "saved": True,
        "my_use_cases": use_cases,
        "survey_unlocked": unlocked,
    }

@app.get("/api/system2/status")
async def system2_status(ctx: Dict[str, str] = Depends(get_system2_context)):
    cohorts = read_system2_cohorts()
    cohort = cohorts.get(ctx["cohort_id"], {})
    unlocked = evaluate_system2_unlock(cohort)
    write_system2_cohorts(cohorts)

    selections = cohort.get("selections", {})
    role = ctx["user_role"]
    other_role = "secondary" if role == "primary" else "primary"
    return {
        "survey_unlocked": unlocked,
        "my_selection_done": bool(selections.get(role, [])),
        "other_selection_done": bool(selections.get(other_role, [])),
    }

@app.get("/api/system2/questions")
async def system2_questions(ctx: Dict[str, str] = Depends(get_system2_context)):
    cohorts = read_system2_cohorts()
    cohort = cohorts.get(ctx["cohort_id"], {})
    if not evaluate_system2_unlock(cohort):
        raise HTTPException(status_code=403, detail="Survey is locked until both users submit use-case selections.")

    master = build_master_lookup()
    questions = sorted(list(master.values()), key=lambda q: str(q.get("QID", "")))
    return {
        "count": len(questions),
        "data": questions,
    }

@app.post("/api/system2/generate-report")
async def system2_generate_report(payload: Dict[str, Any], ctx: Dict[str, str] = Depends(get_system2_context)):
    cohorts = read_system2_cohorts()
    cohort = cohorts.get(ctx["cohort_id"], {})
    if not evaluate_system2_unlock(cohort):
        raise HTTPException(status_code=403, detail="Survey is locked until both users submit use-case selections.")

    raw_responses = payload.get("responses", [])
    if not isinstance(raw_responses, list) or not raw_responses:
        raise HTTPException(status_code=400, detail="responses must be a non-empty list.")

    company = CompanyProfile(
        company_name=cohort.get("company_name", "System 2 Organisation"),
        industry="All Industries",
        company_size="Unknown",
        regulatory_region="All Jurisdictions",
        ai_use_cases=[],
        ai_maturity_level="Unknown",
        assessor_name=ctx["email"],
        assessor_email=ctx["email"],
        assessor_role=ctx["user_role"],
    )

    responses: List[UserResponse] = []
    for item in raw_responses:
        try:
            responses.append(UserResponse(
                question_id=str(item.get("question_id", "")),
                answer_option=str(item.get("answer_option", "")),
                option_order=int(item.get("option_order", 1)),
            ))
        except Exception:
            continue

    if not responses:
        raise HTTPException(status_code=400, detail="No valid responses provided.")

    assessment_payload = AssessmentPayload(company=company, responses=responses)
    return await generate_report(assessment_payload, ctx["email"])

# ── API ENDPOINTS ─────────────────────────────────────────────────────────────
@app.get("/api/clusters")
async def get_clusters(current_user: str = Depends(get_current_user)):
    clusters = get_cluster_list()
    return {"count": len(clusters), "data": clusters}

@app.get("/api/questions")
async def get_all_questions(current_user: str = Depends(get_current_user)):
    master = build_master_lookup()
    data = list(master.values())
    return {"count": len(data), "data": data}

@app.get("/api/questions/cluster/{cluster_name:path}")
async def get_questions_by_cluster(cluster_name: str, current_user: str = Depends(get_current_user)):
    master = build_master_lookup()
    filtered = [q for q in master.values() if q["Cluster_Group"] == cluster_name]
    if not filtered:
        raise HTTPException(status_code=404, detail=f"No questions found for cluster: {cluster_name}")
    return {"cluster": cluster_name, "count": len(filtered), "data": filtered}

@app.get("/api/rationale/{qid}")
async def get_rationale(qid: str, current_user: str = Depends(get_current_user)):
    master = build_master_lookup()
    q = master.get(qid)
    if not q:
        raise HTTPException(status_code=404, detail=f"No question found for QID: {qid}")
    return {"QID": qid, "Question_Text": q["Question_Text"], "Rationale": q["Rationale"]}

@app.get("/api/industries")
async def get_industries(current_user: str = Depends(get_current_user)):
    df = load_industries()
    if df.empty:
        return {"count": 0, "data": []}
    unique = sorted(df["Industry"].dropna().unique().tolist()) if "Industry" in df.columns else []
    return {"count": len(unique), "data": unique}

@app.get("/api/jurisdictions")
async def get_jurisdictions(current_user: str = Depends(get_current_user)):
    df = load_jurisdictions()
    if df.empty:
        return {"count": 0, "data": []}
    unique = sorted(df["Jurisdiction"].dropna().unique().tolist()) if "Jurisdiction" in df.columns else []
    return {"count": len(unique), "data": unique}

@app.get("/api/ai-use-cases")
async def get_ai_use_cases(current_user: str = Depends(get_current_user)):
    use_cases = load_use_cases_from_mapper()
    return {"count": len(use_cases), "data": use_cases}

class QuestionnaireBuildPayload(BaseModel):
    ai_use_cases: List[str] = Field(default_factory=list)
    seed: Optional[int] = None

@app.post("/api/questionnaire/build")
async def build_questionnaire(payload: QuestionnaireBuildPayload, current_user: str = Depends(get_current_user)):
    if not payload.ai_use_cases:
        raise HTTPException(status_code=400, detail="At least one AI use case must be provided.")

    unique_cases = sorted(set([uc.strip() for uc in payload.ai_use_cases if str(uc).strip()]))
    if len(unique_cases) < 1 or len(unique_cases) > 5:
        raise HTTPException(status_code=400, detail="Select a minimum of 1 and a maximum of 5 AI use cases.")

    result = build_mapper_questionnaire(unique_cases, payload.seed)
    return {
        "count": len(result["questions"]),
        "data": result["questions"],
        "meta": result["meta"],
    }

# ── PYDANTIC MODELS ───────────────────────────────────────────────────────────
class CompanyProfile(BaseModel):
    company_name: str = Field(..., max_length=200)
    industry: str = Field(..., max_length=100)
    company_size: str = Field(..., max_length=50)
    regulatory_region: str = Field(..., max_length=100)
    ai_use_cases: List[str] = Field(default_factory=list)
    ai_maturity_level: str = Field(..., max_length=100)
    assessor_name: str = Field(..., max_length=150)
    assessor_email: str = Field(..., max_length=150)
    assessor_role: Optional[str] = Field(default="", max_length=150)

class UserResponse(BaseModel):
    question_id: str = Field(..., max_length=50)
    cluster_group: str = Field(default="", max_length=200)
    answer_option: str = Field(..., max_length=500)
    option_order: int = Field(default=1)

class AssessmentPayload(BaseModel):
    company: CompanyProfile
    responses: List[UserResponse]

class PDFReportPayload(BaseModel):
    company: CompanyProfile
    responses: List[UserResponse]
    score: float
    tier: str
    risk_level: str
    tagline: str
    description: str
    findings: List[str] = []

# ── TIER LOGIC ────────────────────────────────────────────────────────────────
def get_tier_info(score):
    if score >= 80:
        return {"tier": "Oversight Leader", "riskLevel": "LOW RISK", "color": "#38A169"}
    if score >= 60:
        return {"tier": "Governance Mature", "riskLevel": "LOW-MEDIUM RISK", "color": "#3182CE"}
    if score >= 40:
        return {"tier": "Developing Controls", "riskLevel": "MEDIUM RISK", "color": "#D69E2E"}
    if score >= 20:
        return {"tier": "Early Stage", "riskLevel": "HIGH RISK", "color": "#DD6B20"}
    return {"tier": "Critical Exposure", "riskLevel": "CRITICAL RISK", "color": "#E53E3E"}

# ── SCORING ENGINE ────────────────────────────────────────────────────────────
OPTION_RISK_MAP = {1: 0.0, 2: 33.0, 3: 67.0, 4: 0.0}  # Option 4 = NA, excluded

@app.post("/api/generate-report")
async def generate_report(payload: AssessmentPayload, current_user: str = Depends(get_current_user)):
    master = build_master_lookup()

    total_risk = 0.0
    answered_count = 0
    skipped_na = 0
    cluster_scores = {}
    triggered_risks = []

    for resp in payload.responses:
        q_data = master.get(resp.question_id, {})
        cluster = resp.cluster_group or q_data.get("Cluster_Group", "Unknown")

        # Option 4 = NA, skip
        if resp.option_order == 4:
            skipped_na += 1
            continue

        answered_count += 1
        risk_value = OPTION_RISK_MAP.get(resp.option_order, 50.0)
        total_risk += risk_value

        if cluster not in cluster_scores:
            cluster_scores[cluster] = {"total_risk": 0.0, "count": 0, "triggered": 0}
        cluster_scores[cluster]["count"] += 1
        cluster_scores[cluster]["total_risk"] += risk_value

        # Options 2 and 3 are trigger points (partial / no)
        if resp.option_order in (2, 3):
            cluster_scores[cluster]["triggered"] += 1
            triggered_risks.append({
                "question_id": resp.question_id,
                "cluster_group": cluster,
                "question_text": q_data.get("Question_Text", ""),
                "risk_category": q_data.get("Risk_Category", ""),
                "question_group": q_data.get("Question_Group", ""),
                "answer": resp.answer_option,
                "option_order": resp.option_order,
                "risk_score": round(risk_value, 2),
                "severity": "High" if resp.option_order == 3 else "Medium",
            })

    # Calculate governance score
    if answered_count == 0:
        governance_score = 0.0
    else:
        avg_risk = total_risk / answered_count if answered_count > 0 else 0
        # Sum all risk across answered
        max_possible_risk = answered_count * 67.0  # worst case all Option 3
        actual_risk = sum(cs["total_risk"] for cs in cluster_scores.values())
        risk_pct = (actual_risk / max_possible_risk * 100) if max_possible_risk > 0 else 0
        governance_score = round(100 - risk_pct, 2)
        governance_score = max(0, min(100, governance_score))

    # Per-cluster breakdown
    cluster_breakdown = {}
    for cluster, data in cluster_scores.items():
        max_risk = data["count"] * 67.0
        if max_risk > 0:
            exposure = (data["total_risk"] / max_risk) * 100
            gov = round(100 - exposure, 2)
        else:
            gov = 0.0
        cluster_breakdown[cluster] = {
            "governance_score": max(0, min(100, gov)),
            "questions_asked": data["count"],
            "trigger_points": data["triggered"],
        }

    # Sort triggered risks
    triggered_risks.sort(key=lambda x: (-x["option_order"], -x["risk_score"]))

    return {
        "governance_score": governance_score,
        "risk_exposure_pct": round(100 - governance_score, 2),
        "total_questions_answered": answered_count,
        "total_trigger_points": len(triggered_risks),
        "questions_skipped_na": skipped_na,
        "cluster_breakdown": cluster_breakdown,
        "triggered_risks": triggered_risks,
    }

# ── PDF BUILDER ───────────────────────────────────────────────────────────────
def build_pdf(payload: PDFReportPayload, report_data: dict) -> io.BytesIO:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter,
        leftMargin=0.75*inch, rightMargin=0.75*inch,
        topMargin=0.75*inch, bottomMargin=0.75*inch)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle("BizcomTitle", parent=styles["Title"],
        fontSize=22, textColor=colors.HexColor("#0B1D33"), spaceAfter=6, fontName="Helvetica-Bold")
    h2_style = ParagraphStyle("BizcomH2", parent=styles["Heading2"],
        fontSize=14, textColor=colors.HexColor("#0B1D33"), spaceBefore=18, spaceAfter=6, fontName="Helvetica-Bold")
    body_style = ParagraphStyle("BizcomBody", parent=styles["Normal"],
        fontSize=10, textColor=colors.HexColor("#2A3D52"), spaceAfter=4, leading=15)
    meta_style = ParagraphStyle("BizcomMeta", parent=styles["Normal"],
        fontSize=9, textColor=colors.HexColor("#8A9BB0"), spaceAfter=3)
    risk_style = ParagraphStyle("BizcomRisk", parent=styles["Normal"],
        fontSize=9, textColor=colors.HexColor("#4A5E72"), spaceAfter=3, leading=14, leftIndent=12)

    story = []
    story.append(Paragraph("Bizcom AI Risk Assessment", title_style))
    story.append(Paragraph("Confidential — Generated by Bizcom AI Governance Platform", meta_style))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#C49B2C"), spaceAfter=16))

    # Company Profile
    story.append(Paragraph("Company Profile", h2_style))
    c = payload.company
    profile_data = [
        ["Company", c.company_name, "Industry", c.industry],
        ["Size", c.company_size, "Region", c.regulatory_region],
        ["AI Maturity", c.ai_maturity_level, "Assessor", f"{c.assessor_name} ({c.assessor_role})"],
    ]
    profile_table = Table(profile_data, colWidths=[1.2*inch, 2.4*inch, 1.2*inch, 2.4*inch])
    profile_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F4F6F9")),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#0B1D33")),
        ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#0B1D33")),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#C49B2C")),
        ("TEXTCOLOR", (2, 0), (2, -1), colors.HexColor("#C49B2C")),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("PADDING", (0, 0), (-1, -1), 7),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E8EDF3")),
    ]))
    story.append(profile_table)
    story.append(Spacer(1, 12))

    # Score Summary
    story.append(Paragraph("Assessment Score Summary", h2_style))
    tier_color_map = {
        "Oversight Leader": "#38A169", "Governance Mature": "#3182CE",
        "Developing Controls": "#D69E2E", "Early Stage": "#DD6B20", "Critical Exposure": "#E53E3E",
    }
    score_data = [
        ["Governance Score", f"{payload.score:.1f} / 100", "Risk Tier", payload.tier],
        ["Risk Level", payload.risk_level, "Risk Exposure", f"{report_data.get('risk_exposure_pct', 0):.1f}%"],
        ["Questions Answered", str(report_data.get("total_questions_answered", 0)),
         "Gaps Identified", str(report_data.get("total_trigger_points", 0))],
    ]
    score_table = Table(score_data, colWidths=[1.5*inch, 2.1*inch, 1.5*inch, 2.1*inch])
    score_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#0B1D33")),
        ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#0B1D33")),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#C49B2C")),
        ("TEXTCOLOR", (2, 0), (2, -1), colors.HexColor("#C49B2C")),
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("PADDING", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E8EDF3")),
    ]))
    story.append(score_table)
    story.append(Spacer(1, 8))
    story.append(Paragraph(html.escape(payload.description), body_style))
    story.append(Spacer(1, 8))

    # Cluster Breakdown
    breakdown = report_data.get("cluster_breakdown", {})
    if breakdown:
        story.append(Paragraph("Cluster Breakdown", h2_style))
        bd_data = [["Cluster", "Governance Score", "Questions", "Gaps"]]
        for grp, data in sorted(breakdown.items(), key=lambda x: x[1]["governance_score"]):
            bd_data.append([grp, f"{data['governance_score']:.1f}%",
                str(data.get("questions_asked", 0)), str(data.get("trigger_points", 0))])
        bd_table = Table(bd_data, colWidths=[3.2*inch, 1.3*inch, 1.0*inch, 1.0*inch])
        bd_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B1D33")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#C49B2C")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("PADDING", (0, 0), (-1, -1), 7),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E8EDF3")),
            ("ROWBACKGROUNDS", (1, 0), (-1, -1), [colors.HexColor("#F4F6F9"), colors.white]),
            ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ]))
        story.append(bd_table)
        story.append(Spacer(1, 12))

    # Key Findings
    if payload.findings:
        story.append(Paragraph("Key Findings", h2_style))
        for f in payload.findings:
            story.append(Paragraph(f"• {html.escape(str(f))}", body_style))
        story.append(Spacer(1, 8))

    # Top Triggered Risks
    top_risks = report_data.get("triggered_risks", [])[:10]
    if top_risks:
        story.append(Paragraph("Triggered Risk Gaps", h2_style))
        for i, risk in enumerate(top_risks, 1):
            story.append(Paragraph(
                f"<b>{i}. [{risk.get('cluster_group','')}] {html.escape(str(risk.get('question_text',''))[:120])}</b>",
                risk_style))
            story.append(Paragraph(
                f"Answer: {risk.get('answer','')} | Risk Score: {risk.get('risk_score',0)} | Severity: {risk.get('severity','')}",
                meta_style))
            story.append(Spacer(1, 6))

    # Footer
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E8EDF3"), spaceBefore=20))
    story.append(Paragraph(
        "© 2026 Bizcom – Building AI Governance Frameworks for Tomorrow. "
        "This report is confidential and intended solely for the named organisation.",
        meta_style))

    doc.build(story)
    buffer.seek(0)
    return buffer

# ── REPORT + PDF ENDPOINTS ────────────────────────────────────────────────────
@app.post("/api/download-report")
async def download_report(payload: PDFReportPayload, current_user: str = Depends(get_current_user)):
    assessment = AssessmentPayload(company=payload.company, responses=payload.responses)
    report_data = await generate_report(assessment, current_user)
    pdf_buffer = build_pdf(payload, report_data)
    return StreamingResponse(pdf_buffer, media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=Bizcom_AI_Risk_Report.pdf"})

# ── HEALTH CHECK ──────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    q = load_questions()
    a = load_possible_answers()
    r = load_rationale()
    c = load_cluster_groups()
    qg = load_question_groups()
    rc = load_risk_categories()
    ind = load_industries()
    jur = load_jurisdictions()
    return {
        "status": "ok",
        "databases": {
            "questions": len(q),
            "possible_answers": len(a),
            "rationale": len(r),
            "cluster_groups": len(c),
            "question_groups": len(qg),
            "risk_categories": len(rc),
            "industries": len(ind),
            "jurisdictions": len(jur),
        },
        "clusters": len(get_cluster_list()),
        "master_lookup_size": len(build_master_lookup()),
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting Bizcom AI Risk Assessment API v3.0...")
    print(f"Data dir: {DATA_DIR}")
    uvicorn.run(app, host="127.0.0.1", port=8000)
