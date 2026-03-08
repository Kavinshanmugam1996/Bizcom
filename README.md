# Bizcom AI Risk Assessment Platform

**Comprehensive Architecture & Governance Framework Documentation**

The **Bizcom AI Risk Assessment Platform** is an elite, interactive risk-diagnostic application. It is uniquely built to help enterprise organizations rapidly evaluate their Artificial Intelligence governance maturity and map out explicit compliance vulnerabilities against recognized frameworks—primarily **ISO 42001**, the **NIST AI RMF**, and the **EU AI Act**.

By employing a context-sensitive interview process along with a rigorous, mathematical **E.A.R.S.** (Expected Asset Risk Score) evaluation architecture, the platform pinpoints granular AI risks and generates executive-ready PDF mitigation reports.

---

## 🌟 1. Core Platform Features

- **Component-Triggered Question Engine**: Assessors do not suffer "survey fatigue." The application intelligently filters a database of 122+ compliance questions down to only those relevant to the specific AI components an organization uses (e.g., *RAG Retrieval Pipelines*, *LLM Models*, *Vector Databases*, *Guardrails*).
- **Secure Assessor Authentication**: The entire ecosystem is protected by an integrated JSON Web Token (JWT) session layer, ensuring that only authenticated users can access confidential risk data or generate reports. Password hashes are securely cryptographically derived using Python's `hashlib.pbkdf2_hmac`.
- **E.A.R.S. Risk Algorithm**: A modified formulation of Expected Asset Risk Scoring. Instead of abstract labels, the platform calculates numeric exposure dynamically—incorporating the question’s baseline weight, the business impact, risk probability, and the user’s declared control effectiveness (Yes / Partial / No).
- **Single-Page React Dashboard**: A premium, responsive interface that smoothly navigates users through Company Profiling → System Inventory Mapping → The Interactive Quiz → Aggregated Results visualization via Recharts.
- **Dynamic Report Generation**: Native generation of enterprise-grade, PDF risk reports leveraging `reportlab`. PDFs highlight overarching governance scores, tier classifications (e.g., *Governance Mature*, *Critical Exposure*), individual risk breakdowns, and direct compliance citations.

---

## 🏗️ 2. Comprehensive System Architecture

### Technology Stack
- **Backend Infrastructure**: Python 3.9+, **FastAPI** (for high-performance async routing), **Uvicorn** (ASGI server)
- **Data Engineering**: **Pandas** (for complex, rapid, purely memory-cached tabular CSV lookups and analytical merges)
- **Security & Auth**: `PyJWT`, `passlib`, `hashlib`
- **Document Export**: `ReportLab` (for precise programmatic PDF construction)
- **Frontend Layer**: **React.js** (loaded via standalone Babel for zero build-step simplicity), **Recharts** (SVG charting)

### Directory Mapping
```text
Bizcom/
├── main.py                     # [CORE] FastAPI routing, JWT auth logic, EARS algorithm, PDF compiler
├── Script.js                   # [UI] React state machine governing the multi-phase frontend wizard
├── index.html                  # [ENTRY] Shell that injects React, Babel, Recharts, and Script.js
├── create_users.py             # [SCRIPT] CLI utility to initialize the users_db.csv with secure hashed passwords
├── run_server.bat              # [SCRIPT] Automated Windows bootstrap (kills rogue port 8000 processes, launches server)
├── requirements.txt            # [CFG] Python dependency manifests
├── README.md                   # This exhaustive architectural document
└── data/                       # [DB] Local tabular CSV databases
    ├── questions_enriched.csv  # 122 dynamic assessment questions, grouped by component & weight
    ├── master_risk_db.csv      # Risk metadata matrix (Probability, Impact, Default Severity)
    ├── compliance_db.csv       # Framework cross-references (ISO 42001, NIST RMF, OWASP, EU AI)
    └── users_db.csv            # Auto-generated database mapping emails to pbkdf2_hmac hashes
```

---

## 🔐 3. Authentication & Security Flow

Every request to a data endpoint is intercepted by FastAPI's `Depends` dependency injection:

1. **Initialization**: On page load, `Script.js` examines the browser `localStorage` for `bizcom_token`. If missing, the app halts at the **Assessor Login** view.
2. **Credential Verification**: The assessor inputs credentials (e.g., `kavin@bizcomgrp.com`), hitting the POST `/api/login` endpoint in `main.py`.
3. **Cryptographic Check**: The backend reads `users_db.csv`, extracts the user's stored salt and hash snippet, and re-computes `hashlib.pbkdf2_hmac` against the submitted password.
4. **JWT Issuance**: If the hashes match, a Time-bound (24hr expiry) JWT token signed with `HS256` is generated.
5. **Session**: The token is stored locally in React. All subsequent API calls to the server (like pulling questions or firing the PDF generator) must affix `Authorization: Bearer <token>` to the HTTP headers. Unauthorized queries return HTTP `401 Unauthorized`.

---

## 🧮 4. The E.A.R.S. Risk Scoring Engine & Final Results

When an assessor submits answers ("Yes", "Partial", "No", "N/A"), the backend processes the data utilizing `compute_ears_score()`. The risk exposure is calculated mathematically based on the exact impact of your controls, rather than arbitrary flat scores.

### 4.1 Core Risk Calculation Formula:
**`Risk Score = (W × I × P × μ × e^(1−V)) / MaxRisk × 100`**

**Variable Breakdown:**
- **W (Weight)**: Importance of the question (Default 1.0 to 2.0).
- **I (Impact)**: Severity of the consequence if the control fails.
- **P (Probability)**: Likelihood of the risk manifesting.
- **V (Visibility)**: Organizational awareness of the risk (0 to 1). High visibility lowers the overall calculated risk.
- **μ (Control Effectiveness)**: The crucial multiplier dictated by the user's answer:
  - **"Yes"** (Controls strictly in place) → **μ = 0.05** *(Shrinks risk to a 5% residual).*
  - **"Partial"** (Incomplete controls) → **μ = 0.50** *(Risk is cut in half).*
  - **"No"** (No controls) → **μ = 1.00** *(Absorbs maximum possible risk exposure).*

*Note: The platform is built around Exceptions. A "Yes" response effectively nullifies the risk multiplier, thus preventing a "Trigger Point". High "No" counts skyrocket the relative Risk Exposure Percentage.*

### 4.2 Total Exposure & Governance Score:
Once all questions are individually scored, the algorithm aggregates them at both the Component-level and the Total Profile-level:
1. **Risk Exposure %** = `(Total Accumulated Risk Score / Absolute Max Possible Risk Score) × 100`
2. **Governance Match Score** = `100 - Risk Exposure %`

---

## 📊 5. The Final Dashboard Results View

When passing into the final **Result Phase** of the React application, exactly four major analytic sections are rendered utilizing the data from the scoring engine:

1. **Governance Match Score:** The large hero metric (0-100%). For example, if your "No" answers generated 32% of the maximum possible risk exposure, your overall Governance Match Score will display as **68 / 100**.
2. **Risk Tier & Level:** A qualitative classification (e.g., "Governance Mature" vs "Critical Exposure") mapped directly to your score cohort, complete with a descriptive tagline.
3. **Component Breakdown (Radar Chart):** A dynamic SVG Recharts visualization. It actively maps your Governance Match Score *specifically isolated to individual AI components* (e.g., showing excellent scores in "Prompt Engineering" but poor scores in "Vector Databases").
4. **Key Mitigation Priorities:** An interactive list of specific "Triggered Risks." It filters out all the "Yes" answers and provides a prioritized, actionable list of only the "No" and "Partial" vulnerabilities sorted by mathematical severity. Each card explicitly tags which compliance framework is breached (ISO 42001, NIST RMF, EU AI Act) due to that specific gap.


---

## 🌐 6. RESTful API Blueprint

- `POST /api/login` → Validates `LoginRequest` (email/pw) returning `{ access_token, token_type }`.
- `GET /api/component-groups` *(Protected)* → Returns the 13 selectable AI tags.
- `POST /api/questions/filtered` *(Protected)* → Receives a JSON array of `selected_groups` and returns only intersecting questions from `questions_enriched.csv`.
- `POST /api/generate-report` *(Protected)* → The heavy-lifter. Takes the user's Company Profile, Inventory list, and Answer Array. Returns an aggregated JSON Risk Profile containing the numeric `governance_score`, specific `component_breakdown`, and nested `compliance_breaches`.
- `POST /api/download-report` *(Protected)* → Generates the raw Byte buffer of the Executive Governance PDF using ReportLab styling, streamed back to the browser.
- `GET /api/health` → Unprotected sanity check verifying dataframe lengths.

---

## ⚙️ 7. Quickstart / Setup Guide

### Phase 1: Environment Preparation

Ensure you have **Python 3.9+** and **Git** installed.
1. Clone the repo:
   ```bash
   git clone https://github.com/Kavinshanmugam1996/Bizcom.git
   cd Bizcom
   ```
2. Create and source a virtual environment:
   ```bash
   # Windows:
   python -m venv venv
   venv\Scripts\activate

   # Unix/MacOS:
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   # OR directly:
   pip install fastapi uvicorn pandas reportlab PyJWT passlib bcrypt
   ```

### Phase 2: Database Initialization

You must bootstrap the user database to log in to the assessment platform.
1. Run the user creation script:
   ```bash
   python create_users.py
   ```
2. This generates `data/users_db.csv` seeded with two encrypted accounts:
   - Email: `kavin@bizcomgrp.com` | Password: `Bizcom@123`
   - Email: `jerry@bizcomgrp.com` | Password: `Bizcom@123`

### Phase 3: Launching the App

There are two primary ways to boot the server locally mapping port `8000`:

**Method A: Windows Auto-Script (Recommended)**
Double-click or run:
```cmd
run_server.bat
```
*(Benefit: This automatically runs a `netstat` and `taskkill` filter to gracefully shut down any orphaned Python processes clinging to port 8000 before deploying the new Uvicorn workers).*

**Method B: Manual Uvicorn**
```bash
python main.py
```

### Phase 4: Begin Assessment

Navigate to the dashboard in your Chromium-based browser:
👉 **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

Log in with your configured credentials to unlock the Risk Platform.

---

## 📄 Licensing & Disclaimer
This software is provided for the sole context of AI Governance Risk calculation. 
**(C) 2026 Bizcom Group. All rights reserved. Do not distribute.**
