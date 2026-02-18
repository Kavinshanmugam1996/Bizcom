const { useState } = React;
const {
    RadarChart, PolarGrid, PolarAngleAxis, Radar,
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} = Recharts;

// ─── BIZCOM BRAND TOKENS ─────────────────────────────────────────────────────
const B = {
    navy: "#0B1D33",   // Primary dark navy (header / hero background)
    navyMid: "#112540",   // Mid navy for cards
    navyLight: "#1A3355",   // Lighter navy for borders / hover
    gold: "#C49B2C",   // Primary gold accent
    goldLight: "#D4A843",   // Lighter gold for glow / hover
    goldDim: "#8B6D1E",   // Muted gold for dim states
    white: "#FFFFFF",
    offWhite: "#F4F6F9",
    lightGrey: "#E8EDF3",
    grey: "#8A9BB0",
    greyDark: "#4A5E72",
    greyDeep: "#2A3D52",
    logoUrl: "https://bizcomgrp.com/wp-content/uploads/2023/09/bizcom_bizcom.png",
};

// Risk tier overrides stay consistent with governance severity
const TIER_COLORS = {
    "Critical Exposure": "#E53E3E",
    "Early Stage": "#DD6B20",
    "Developing Controls": "#D69E2E",
    "Governance Mature": "#3182CE",
    "Oversight Leader": "#38A169",
};

// ─── QUESTION BANK ───────────────────────────────────────────────────────────
const QUESTIONS = [
    // ── GOVERNANCE & POLICY (1–10)
    { id: 1, category: "Governance & Policy", text: "Does your organisation have a formal AI governance policy or framework in place?", options: ["No policy exists", "An informal or ad-hoc approach is used", "A draft policy exists but is not fully adopted", "A documented, board-approved AI governance policy is in place"] },
    { id: 2, category: "Governance & Policy", text: "Is there a designated role or committee responsible for AI oversight (e.g. AI Ethics Board, Chief AI Officer)?", options: ["No dedicated role or committee exists", "Responsibility is informally assigned to an individual", "A committee exists but meets infrequently", "A dedicated committee with a clear mandate meets regularly"] },
    { id: 3, category: "Governance & Policy", text: "How frequently is your AI governance framework reviewed and updated?", options: ["Never reviewed", "Reviewed only after an incident", "Reviewed annually", "Reviewed continuously with structured quarterly updates"] },
    { id: 4, category: "Governance & Policy", text: "To what extent are AI-related decisions escalated to senior leadership or the board?", options: ["AI decisions are never escalated", "Only major failures are escalated", "Significant deployments are reported to leadership", "AI risk is a standing agenda item at board/executive level"] },
    { id: 5, category: "Governance & Policy", text: "Does your organisation maintain an inventory or register of all AI systems in use?", options: ["No inventory exists", "A partial, informal list exists", "A register exists but is not consistently maintained", "A comprehensive, regularly audited AI asset register is in place"] },
    { id: 6, category: "Governance & Policy", text: "How well do your AI policies align with applicable regulations (e.g. EU AI Act, ISO 42001, GDPR)?", options: ["No alignment effort has been made", "Aware of regulations but not formally mapped", "Partial mapping completed for key systems", "Full regulatory mapping with compliance evidence maintained"] },
    { id: 7, category: "Governance & Policy", text: "Is there a clear process for approving new AI systems before they are deployed in production?", options: ["No approval process — any team can deploy", "Informal sign-off from a single manager", "Structured review by IT or legal before deployment", "Multi-stakeholder gate review with documented sign-off"] },
    { id: 8, category: "Governance & Policy", text: "How are third-party or vendor-supplied AI systems governed within your organisation?", options: ["No governance of third-party AI", "Vendor contracts exist but AI-specific clauses are absent", "AI provisions are included in some vendor contracts", "All vendor AI is subject to due diligence, contractual controls, and ongoing review"] },
    { id: 9, category: "Governance & Policy", text: "Does your organisation have a whistleblowing or escalation channel specifically for AI-related concerns?", options: ["No channel exists", "General whistleblowing exists but is not AI-specific", "AI concerns can be raised through a general ethics channel", "A dedicated, anonymous AI concerns channel with response SLAs exists"] },
    { id: 10, category: "Governance & Policy", text: "Are AI governance responsibilities clearly documented in job descriptions and performance frameworks?", options: ["Not at all", "Mentioned informally for some roles", "Included in select roles (e.g. data teams)", "Embedded across all relevant roles with measurable accountability"] },

    // ── RISK AWARENESS (11–20)
    { id: 11, category: "Risk Awareness", text: "Has your organisation conducted a formal AI risk assessment in the past 12 months?", options: ["No risk assessment has ever been conducted", "A risk assessment was done over 2 years ago", "An assessment was done 1–2 years ago", "A structured risk assessment is conducted at least annually"] },
    { id: 12, category: "Risk Awareness", text: "How well does your organisation understand the specific risks posed by each AI system it uses?", options: ["Risks are largely unknown", "High-level risks are understood but not documented", "Risks are documented for key systems", "Comprehensive risk profiles exist for all AI systems with residual risk ratings"] },
    { id: 13, category: "Risk Awareness", text: "Does your organisation classify AI systems by risk level (e.g. high, medium, low risk)?", options: ["No classification exists", "Informal categorisation by individual teams", "A classification scheme exists but is inconsistently applied", "All systems are formally classified and controls are risk-proportionate"] },
    { id: 14, category: "Risk Awareness", text: "How aware is your leadership team of the reputational risks associated with AI misuse or failure?", options: ["Not aware — AI risk is not on their radar", "Vaguely aware but not actively managed", "Aware and occasionally discussed", "Fully aware with reputational risk factored into AI decisions"] },
    { id: 15, category: "Risk Awareness", text: "Has your organisation experienced an AI-related incident, error, or controversy in the past 2 years?", options: ["Yes, and it was not properly investigated", "Yes, but only a basic post-mortem was conducted", "Yes, and a structured review with corrective actions followed", "No significant incidents, and proactive red-teaming is in place"] },
    { id: 16, category: "Risk Awareness", text: "To what extent are AI risks included in your organisation's enterprise risk register?", options: ["Not included at all", "Mentioned under 'technology risk' with no specificity", "AI risks appear as a category with some detail", "AI risks are fully itemised with owners, likelihood, impact, and mitigations"] },
    { id: 17, category: "Risk Awareness", text: "How does your organisation assess the risk of bias or discrimination in AI outputs?", options: ["No assessment is done", "Relies on vendor assurances only", "Internal spot-checks are performed occasionally", "Systematic bias testing is conducted pre-deployment and periodically thereafter"] },
    { id: 18, category: "Risk Awareness", text: "Does your organisation assess the risks of AI systems being used outside their intended purpose?", options: ["No — misuse scenarios are not considered", "Discussed informally during development", "Misuse cases are documented for some systems", "Formal misuse threat modelling is part of every AI deployment"] },
    { id: 19, category: "Risk Awareness", text: "How prepared is your organisation for an AI-related regulatory audit or investigation?", options: ["Not prepared at all", "Some documentation exists but is not audit-ready", "Mostly prepared with some gaps", "Fully prepared with evidence packs and a designated response team"] },
    { id: 20, category: "Risk Awareness", text: "Are supply chain AI risks (risks from AI used by your suppliers or partners) assessed?", options: ["No — only internal AI is considered", "Occasionally discussed but not assessed", "Key suppliers are informally reviewed", "Supply chain AI risks are formally assessed and contractually managed"] },

    // ── OPERATIONAL CONTROLS (21–30)
    { id: 21, category: "Operational Controls", text: "Are there controls to monitor AI system outputs in real time or near-real time?", options: ["No monitoring exists", "Manual spot-checks are performed occasionally", "Automated alerts exist for some systems", "Continuous monitoring with dashboards and automated anomaly detection"] },
    { id: 22, category: "Operational Controls", text: "Does your organisation have a documented process for handling AI errors or unexpected outputs?", options: ["No process exists", "Teams handle errors ad hoc", "A general incident process is used", "An AI-specific incident response process with RCA and escalation paths"] },
    { id: 23, category: "Operational Controls", text: "Is there a human-in-the-loop mechanism for high-stakes AI decisions?", options: ["AI decisions are fully automated with no human review", "Human review happens occasionally and informally", "Human approval is required for some high-risk outputs", "Mandatory human review for all high-stakes decisions with documented override log"] },
    { id: 24, category: "Operational Controls", text: "How are AI model versions and changes tracked and controlled?", options: ["No version control or change management", "Informal tracking by individual developers", "Version control exists but change management is limited", "Full MLOps pipeline with versioning, change approval, and rollback capability"] },
    { id: 25, category: "Operational Controls", text: "Are access controls applied to restrict who can modify or retrain AI models?", options: ["Anyone can modify AI systems", "Access is restricted informally", "Role-based access control exists for most systems", "Strict least-privilege access with full audit logging for all AI modifications"] },
    { id: 26, category: "Operational Controls", text: "How is the quality and integrity of training data for AI systems managed?", options: ["No data quality checks are in place", "Basic data validation is performed", "Documented data quality standards exist for key models", "Comprehensive data governance including lineage, quality gates, and consent tracking"] },
    { id: 27, category: "Operational Controls", text: "Does your organisation test AI systems for security vulnerabilities (e.g. adversarial attacks, prompt injection)?", options: ["No security testing of AI", "General cybersecurity tests are applied", "Some AI-specific security tests are performed", "Regular red-teaming and adversarial testing are part of the deployment pipeline"] },
    { id: 28, category: "Operational Controls", text: "Are there defined performance thresholds that trigger a review or shutdown of an AI system?", options: ["No thresholds are defined", "Thresholds are informally understood", "Thresholds exist for some key metrics", "Formally defined KPIs and kill-switch criteria for all production AI systems"] },
    { id: 29, category: "Operational Controls", text: "How are AI system logs retained and used for accountability purposes?", options: ["No logging in place", "Logs exist but are not structured or retained", "Logs are retained for a defined period but infrequently reviewed", "Immutable audit logs retained per policy with regular review and forensic capability"] },
    { id: 30, category: "Operational Controls", text: "Is there a tested business continuity plan for critical AI system failures?", options: ["No continuity plan", "General IT continuity covers AI loosely", "AI systems are included in BCP but untested", "AI-specific continuity plans are documented and tested regularly"] },

    // ── ETHICS & COMPLIANCE (31–38)
    { id: 31, category: "Ethics & Compliance", text: "Does your organisation have a published set of AI ethics principles?", options: ["No principles exist", "Ethics principles are informally discussed but not documented", "Principles are documented for internal use only", "Published AI ethics principles are embedded in policy and externally communicated"] },
    { id: 32, category: "Ethics & Compliance", text: "How is fairness and non-discrimination assessed before an AI system goes live?", options: ["No fairness assessment is conducted", "Developers use personal judgement", "A fairness checklist is reviewed before launch", "Quantitative fairness metrics are tested across demographic groups pre-launch"] },
    { id: 33, category: "Ethics & Compliance", text: "Are individuals informed when an AI system is making or influencing decisions about them?", options: ["No disclosure is made", "Disclosure is made only if legally required", "Disclosure is made for most AI-driven decisions", "Clear, accessible disclosure is standard practice for all AI-influenced decisions"] },
    { id: 34, category: "Ethics & Compliance", text: "Is there a mechanism for individuals to contest or appeal AI-generated decisions?", options: ["No appeal mechanism exists", "Complaints go through a general customer service route", "A specific escalation path for AI decisions exists", "A transparent, timely appeals process with human review and documented outcomes"] },
    { id: 35, category: "Ethics & Compliance", text: "How are data privacy obligations (e.g. GDPR, PIPEDA, CCPA) integrated into AI system design?", options: ["Privacy is not considered in AI design", "Privacy is reviewed post-build if issues arise", "Privacy impact assessments are conducted for some AI systems", "Privacy-by-design is a mandatory requirement in all AI development and procurement"] },
    { id: 36, category: "Ethics & Compliance", text: "Does your organisation consider the environmental impact of AI systems (e.g. energy consumption)?", options: ["Not at all", "Mentioned in sustainability reports without specific AI data", "Energy use is tracked for major AI infrastructure", "Environmental impact is formally assessed and optimisation targets are set"] },
    { id: 37, category: "Ethics & Compliance", text: "Are workers or employees consulted or informed when AI systems affect their roles or workflows?", options: ["No consultation takes place", "Affected staff are informed after deployment", "Consultation occurs during rollout for major changes", "Structured consultation with staff representatives before any AI-driven workflow change"] },
    { id: 38, category: "Ethics & Compliance", text: "Does your organisation conduct or commission independent ethical audits of its AI systems?", options: ["No audits have been conducted", "Internal ethical reviews are done informally", "Internal structured ethical reviews are conducted", "Regular independent third-party ethical audits with published findings"] },

    // ── TECHNICAL LITERACY (39–44)
    { id: 39, category: "Technical Literacy", text: "How well do your senior decision-makers understand the AI systems used in your organisation?", options: ["Very limited — they rely entirely on technical teams", "Basic awareness of capabilities but not risks or limitations", "Good conceptual understanding of key systems", "Strong literacy including understanding of model limitations, failure modes, and risks"] },
    { id: 40, category: "Technical Literacy", text: "Can your organisation's staff identify the signs of a degraded or misbehaving AI system?", options: ["No — staff have no training on this", "A few technical staff could identify issues", "Most operational staff have basic awareness", "All staff interacting with AI have training on identifying and reporting anomalies"] },
    { id: 41, category: "Technical Literacy", text: "Does your organisation understand the concept of AI model drift and monitor for it?", options: ["Not aware of model drift", "Aware but no monitoring in place", "Monitoring in place for critical models", "Systematic drift detection with defined response protocols for all models"] },
    { id: 42, category: "Technical Literacy", text: "How well does your organisation understand explainability requirements for its AI systems?", options: ["Explainability is not considered", "Aware of the concept but no formal approach", "Explainability tools used for some high-risk systems", "Explainability requirements defined per system, with appropriate methods applied"] },
    { id: 43, category: "Technical Literacy", text: "Does your organisation have technical capability to retrain or adjust AI models when problems arise?", options: ["Entirely dependent on vendors — no internal capability", "Limited internal capability for minor adjustments", "Moderate internal capability with some vendor dependency", "Strong internal capability to retrain, adjust, and validate models independently"] },
    { id: 44, category: "Technical Literacy", text: "How mature is your organisation's AI documentation (e.g. model cards, data sheets, system cards)?", options: ["No documentation exists", "Ad hoc documentation by individual developers", "Standardised documentation for major models", "Comprehensive, standardised documentation for all AI systems, regularly updated"] },

    // ── STRATEGIC READINESS (45–50)
    { id: 45, category: "Strategic Readiness", text: "Does your organisation have a long-term AI strategy that accounts for oversight and governance?", options: ["No AI strategy exists", "A strategy focuses only on capability and speed of adoption", "Strategy mentions governance at a high level", "A balanced strategy explicitly integrates oversight, safety, and responsible scaling"] },
    { id: 46, category: "Strategic Readiness", text: "How prepared is your organisation to respond to new AI regulations introduced in the next 2 years?", options: ["Not prepared — we will react when regulations arrive", "Monitoring developments but no preparation underway", "Some preparatory work underway", "Actively engaged with regulators and prepared for likely requirements"] },
    { id: 47, category: "Strategic Readiness", text: "Is AI oversight adequately resourced (budget, headcount, tools) within your organisation?", options: ["No dedicated resources for AI oversight", "Oversight is done as a side responsibility by existing staff", "Some dedicated resource exists but is insufficient", "Oversight is fully resourced with dedicated budget, staff, and tooling"] },
    { id: 48, category: "Strategic Readiness", text: "Does your organisation collaborate with external bodies (regulators, industry groups, academia) on AI oversight?", options: ["No external engagement", "Occasional participation in industry events only", "Active membership in industry working groups", "Proactive engagement with regulators, standards bodies, and research institutions"] },
    { id: 49, category: "Strategic Readiness", text: "How embedded is a culture of responsible AI use across your organisation?", options: ["Not embedded — AI is seen purely as a productivity tool", "Awareness is growing but culture has not yet shifted", "Responsible AI is valued but not consistently practiced", "Responsible AI is a core organisational value, modelled by leadership and lived daily"] },
    { id: 50, category: "Strategic Readiness", text: "What is your organisation's overall commitment to improving AI oversight in the next 12 months?", options: ["No commitment — current approach is considered adequate", "Some interest but no defined plan", "A plan is in development", "A funded, time-bound improvement roadmap is approved and in execution"] },
];

const CATEGORIES = [
    "Governance & Policy",
    "Risk Awareness",
    "Operational Controls",
    "Ethics & Compliance",
    "Technical Literacy",
    "Strategic Readiness",
];

const CAT_WEIGHTS = {
    "Governance & Policy": 0.25,
    "Risk Awareness": 0.25,
    "Operational Controls": 0.20,
    "Ethics & Compliance": 0.15,
    "Technical Literacy": 0.10,
    "Strategic Readiness": 0.05,
};

// Gold shades for each category bar
const CAT_BAR_COLORS = ["#C49B2C", "#D4A843", "#B8872A", "#E0B955", "#9A7822", "#C49B2C"];

// ─── PROFILE TIERS ───────────────────────────────────────────────────────────
function getTierInfo(score) {
    if (score >= 80) return {
        tier: "Oversight Leader", riskLevel: "LOW RISK", color: TIER_COLORS["Oversight Leader"],
        tagline: "Exemplary AI governance maturity",
        description: "Your organisation demonstrates exceptional AI oversight across governance, operations, and ethics. Robust controls, strong accountability structures, and a mature risk culture place you in the top tier of AI governance readiness — consistent with ISO 42001 best practice.",
        findings: [
            "Comprehensive governance frameworks are well embedded and consistently enforced",
            "AI risks are systematically identified, rated, and mitigated across all systems",
            "Human oversight mechanisms are operational, documented, and regularly tested",
            "Ethical principles are operationalised and validated through independent audits",
        ],
        actions: [
            "Publish an annual AI transparency report to set industry benchmarks",
            "Share governance frameworks with peers and regulators to shape emerging standards",
            "Invest in next-generation oversight tooling such as automated compliance monitoring",
            "Continue red-teaming and adversarial testing as AI capabilities scale",
        ],
    };
    if (score >= 60) return {
        tier: "Governance Mature", riskLevel: "LOW-MEDIUM RISK", color: TIER_COLORS["Governance Mature"],
        tagline: "Strong foundations with targeted gaps",
        description: "Your organisation has solid AI governance structures in place. Most controls are operational and leadership is engaged. A focused number of gaps exist — particularly around third-party AI oversight, independent auditing, or technical monitoring depth.",
        findings: [
            "Core governance policies are documented and broadly adopted",
            "Risk assessments are conducted but may lack depth or coverage for all systems",
            "Human-in-the-loop controls exist for most high-stakes decisions",
            "Ethics principles are documented but not yet independently validated",
        ],
        actions: [
            "Commission an independent third-party AI ethical audit within 6 months",
            "Extend AI risk classifications to all systems including shadow AI and vendor tools",
            "Formalise supply chain AI due diligence requirements in all vendor contracts",
            "Define and test kill-switch criteria for all production AI systems",
        ],
    };
    if (score >= 40) return {
        tier: "Developing Controls", riskLevel: "MEDIUM RISK", color: TIER_COLORS["Developing Controls"],
        tagline: "Foundational work in progress",
        description: "AI oversight is recognised within your organisation but implementation is inconsistent. Key controls are missing or unevenly applied. Without structured investment, regulatory pressure or an AI incident could expose significant vulnerabilities.",
        findings: [
            "Governance policies exist but are not consistently enforced across teams",
            "AI risk assessments are conducted reactively rather than proactively",
            "Monitoring and incident response processes are largely ad hoc",
            "Ethics considerations are discussed but not systematically applied to deployments",
        ],
        actions: [
            "Establish a dedicated AI governance committee with a clear mandate and board sponsor",
            "Conduct a full AI system inventory and classify all systems by risk level",
            "Implement mandatory human review for all high-stakes AI-driven outputs",
            "Draft and adopt an AI incident response plan with named owners and response SLAs",
            "Initiate organisation-wide staff training on responsible AI and anomaly identification",
        ],
    };
    if (score >= 20) return {
        tier: "Early Stage", riskLevel: "HIGH RISK", color: TIER_COLORS["Early Stage"],
        tagline: "Significant gaps requiring urgent attention",
        description: "Your organisation's AI oversight posture presents material risk. Governance is largely informal, risk assessment is limited, and operational controls are insufficient for the AI systems likely in use. Regulatory exposure and reputational risk are elevated.",
        findings: [
            "No comprehensive AI governance framework is in place",
            "AI risks are not systematically identified, classified, or managed",
            "AI systems may be operating without adequate human oversight or monitoring",
            "Legal and regulatory compliance cannot be reliably demonstrated",
        ],
        actions: [
            "Prioritise creation of an AI governance policy as an immediate deliverable",
            "Appoint a designated AI oversight lead or committee with board-level sponsorship",
            "Conduct an emergency AI system inventory — identify everything deployed now",
            "Engage legal and compliance teams to map current regulatory exposure",
            "Pause deployment of new high-risk AI systems until minimum controls are confirmed",
            "Commission external AI governance advisory support",
        ],
    };
    return {
        tier: "Critical Exposure", riskLevel: "CRITICAL RISK", color: TIER_COLORS["Critical Exposure"],
        tagline: "Immediate executive intervention required",
        description: "Your organisation's AI oversight posture represents a critical risk. The absence of governance, controls, and accountability creates severe regulatory, reputational, and operational exposure. Immediate executive-level action is required.",
        findings: [
            "No AI governance structure or policy of any kind exists",
            "AI systems are deployed without risk assessment, classification, or documentation",
            "No human oversight mechanisms are in place for any AI-driven decisions",
            "Ethics, privacy, and regulatory compliance are entirely unaddressed",
        ],
        actions: [
            "Convene an emergency executive review of all AI in use within 30 days",
            "Engage an external AI governance specialist immediately",
            "Suspend all high-risk AI deployments until minimum controls are confirmed",
            "Establish a basic AI risk register as the first step to structured management",
            "Brief the board on AI risk exposure and secure a dedicated governance budget",
            "Map regulatory obligations and assess current non-compliance exposure urgently",
        ],
    };
}

function computeProfile(answers) {
    const catScores = {};
    CATEGORIES.forEach(cat => {
        const qs = QUESTIONS.filter(q => q.category === cat);
        const vals = qs.map(q => answers[q.id] ?? 0);
        catScores[cat] = Math.round((vals.reduce((a, b) => a + b, 0) / (qs.length * 3)) * 100);
    });
    const total = Math.round(
        Object.keys(CAT_WEIGHTS).reduce((sum, cat) => sum + (catScores[cat] || 0) * CAT_WEIGHTS[cat], 0)
    );
    return { catScores, total, ...getTierInfo(total) };
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function BizcomLogo({ style = {} }) {
    return (
        <img
            src={B.logoUrl}
            alt="Bizcom"
            style={{ height: 44, objectFit: "contain", ...style }}
            onError={e => { e.target.style.display = "none"; }}
        />
    );
}

function NavBar({ showContact = true }) {
    return (
        <div style={{ background: B.navy, borderBottom: `1px solid ${B.navyLight}`, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 68, boxSizing: "border-box", position: "sticky", top: 0, zIndex: 100 }}>
            <BizcomLogo />
            {showContact && (
                <a href="https://bizcomgrp.com/contact/" target="_blank" rel="noreferrer" style={{ background: B.gold, color: B.navy, fontFamily: "sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", padding: "9px 20px", borderRadius: 6, textDecoration: "none", whiteSpace: "nowrap" }}>
                    Contact Us
                </a>
            )}
        </div>
    );
}

function Footer() {
    return (
        <div style={{ background: B.navy, borderTop: `1px solid ${B.navyLight}`, padding: "28px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <BizcomLogo style={{ height: 36 }} />
            <p style={{ fontFamily: "sans-serif", fontSize: 11, color: B.greyDark, margin: 0, letterSpacing: "0.03em" }}>
                © 2026 Bizcom – Building AI Governance Frameworks for Tomorrow. All Rights Reserved.
            </p>
            <a href="https://bizcomgrp.com" target="_blank" rel="noreferrer" style={{ fontFamily: "sans-serif", fontSize: 11, color: B.gold, textDecoration: "none", letterSpacing: "0.04em" }}>
                bizcomgrp.com →
            </a>
        </div>
    );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function App() {
    const [phase, setPhase] = useState("intro");
    const [current, setCurrent] = useState(0);
    const [answers, setAnswers] = useState({});
    const [selected, setSelected] = useState(null);
    const [animIn, setAnimIn] = useState(true);
    const [profile, setProfile] = useState(null);
    const [pdfGenerating, setPdfGenerating] = useState(false);

    const q = QUESTIONS[current];
    const progress = (current / QUESTIONS.length) * 100;

    function next() {
        if (selected === null) return;
        const updated = { ...answers, [q.id]: selected };
        setAnswers(updated);
        setAnimIn(false);
        setTimeout(() => {
            if (current + 1 < QUESTIONS.length) {
                setCurrent(c => c + 1);
                setSelected(null);
                setAnimIn(true);
            } else {
                setProfile(computeProfile(updated));
                setPhase("result");
            }
        }, 260);
    }

    function back() {
        if (current === 0) { setPhase("intro"); return; }
        setAnimIn(false);
        setTimeout(() => {
            const prev = current - 1;
            setCurrent(prev);
            setSelected(answers[QUESTIONS[prev].id] ?? null);
            setAnimIn(true);
        }, 260);
    }

    function restart() {
        setCurrent(0); setAnswers({}); setSelected(null); setProfile(null);
        setPhase("intro"); setAnimIn(true);
    }

    async function downloadPDF() {
        setPdfGenerating(true);
        try {
            const response = await fetch('http://127.0.0.1:8000/api/generate-pdf-from-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profile)
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = "Bizcom_AI_Risk_Report.pdf";
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                alert("Failed to generate PDF. Please try again.");
            }
        } catch (e) {
            console.error(e);
            alert("Error generating PDF.");
        }
        setPdfGenerating(false);
    }

    // ══════════════════════════════════════════
    // INTRO
    // ══════════════════════════════════════════
    if (phase === "intro") return (
        <div style={{ minHeight: "100vh", background: B.offWhite, display: "flex", flexDirection: "column", fontFamily: "sans-serif" }}>
            <NavBar />

            {/* Hero */}
            <div style={{ background: B.navy, padding: "64px 24px 56px", textAlign: "center" }}>
                <div style={{ display: "inline-block", background: `${B.gold}22`, border: `1px solid ${B.gold}55`, borderRadius: 4, padding: "5px 16px", marginBottom: 20 }}>
                    <span style={{ fontSize: 10, letterSpacing: "0.22em", color: B.gold, textTransform: "uppercase", fontWeight: 600 }}>AI Governance Diagnostic</span>
                </div>
                <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 800, color: B.white, margin: "0 0 8px", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
                    AI Oversight
                </h1>
                <h1 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 800, color: B.gold, margin: "0 0 24px", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
                    Risk Profiler
                </h1>
                <p style={{ color: "#94A3B8", fontSize: 16, lineHeight: 1.75, maxWidth: 560, margin: "0 auto 32px" }}>
                    A structured 50-question diagnostic built on ISO 42001 and NIST-RMF principles — assessing your organisation's AI oversight maturity across six critical dimensions. Receive an evidence-based risk profile and prioritised action plan.
                </p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 40 }}>
                    {["50 Questions", "6 Dimensions", "ISO 42001 Aligned", "Instant Report", "10–15 Minutes"].map(t => (
                        <span key={t} style={{ fontSize: 11, color: B.grey, background: `${B.white}08`, border: `1px solid ${B.navyLight}`, borderRadius: 100, padding: "5px 14px", letterSpacing: "0.05em" }}>{t}</span>
                    ))}
                </div>
                <button
                    onClick={() => { setPhase("quiz"); setAnimIn(true); }}
                    style={{ background: B.gold, color: B.navy, border: "none", borderRadius: 8, padding: "16px 44px", fontSize: 15, fontWeight: 700, letterSpacing: "0.06em", cursor: "pointer", boxShadow: `0 4px 24px ${B.gold}44` }}
                >
                    Begin Assessment →
                </button>
                <p style={{ color: "#3A5069", fontSize: 11, marginTop: 14, letterSpacing: "0.05em" }}>All responses are private · No data is stored or transmitted</p>
            </div>

            {/* Dimensions grid */}
            <div style={{ background: B.white, padding: "48px 24px" }}>
                <div style={{ maxWidth: 900, margin: "0 auto" }}>
                    <p style={{ textAlign: "center", fontSize: 11, letterSpacing: "0.18em", color: B.gold, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Assessment Dimensions</p>
                    <h2 style={{ textAlign: "center", fontSize: 24, fontWeight: 700, color: B.navy, marginBottom: 32 }}>Six Critical Dimensions of AI Oversight</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                        {CATEGORIES.map((cat) => (
                            <div key={cat} style={{ background: B.offWhite, border: `1px solid ${B.lightGrey}`, borderLeft: `4px solid ${B.gold}`, borderRadius: 10, padding: "20px 18px" }}>
                                <div style={{ fontSize: 22, fontWeight: 800, color: B.gold, fontFamily: "monospace", marginBottom: 6 }}>{Math.round(CAT_WEIGHTS[cat] * 100)}%</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: B.navy, marginBottom: 4 }}>{cat}</div>
                                <div style={{ fontSize: 11, color: B.greyDark }}>Weighted dimension</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Risk tiers */}
            <div style={{ background: B.navy, padding: "48px 24px" }}>
                <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
                    <p style={{ fontSize: 11, letterSpacing: "0.18em", color: B.gold, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Risk Tiers</p>
                    <h2 style={{ fontSize: 24, fontWeight: 700, color: B.white, marginBottom: 32 }}>Where Will Your Organisation Land?</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                        {Object.entries(TIER_COLORS).map(([tier, color]) => (
                            <div key={tier} style={{ background: `${color}15`, border: `1px solid ${color}40`, borderRadius: 10, padding: "16px 12px" }}>
                                <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, margin: "0 auto 10px", boxShadow: `0 0 10px ${color}` }} />
                                <div style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: "0.02em" }}>{tier}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );

    // ══════════════════════════════════════════
    // RESULT
    // ══════════════════════════════════════════
    if (phase === "result" && profile) {
        const radarData = CATEGORIES.map(cat => ({
            subject: cat.length > 14 ? cat.replace(" & ", "\n& ").replace("Operational ", "Op.\n").replace("Technical ", "Tech.\n").replace("Strategic ", "Strat.\n") : cat,
            value: profile.catScores[cat] || 0,
            fullMark: 100,
        }));
        const barData = CATEGORIES.map((cat, i) => ({
            name: cat.split(" ")[0],
            value: profile.catScores[cat] || 0,
            color: CAT_BAR_COLORS[i],
        }));

        return (
            <div style={{ minHeight: "100vh", background: B.offWhite, fontFamily: "sans-serif", display: "flex", flexDirection: "column" }}>
                <NavBar />

                {/* Result hero */}
                <div style={{ background: B.navy, padding: "48px 24px 40px", textAlign: "center", borderBottom: `3px solid ${profile.color}` }}>
                    <div style={{ display: "inline-block", background: `${profile.color}22`, border: `1px solid ${profile.color}55`, borderRadius: 4, padding: "5px 16px", marginBottom: 16 }}>
                        <span style={{ fontSize: 10, letterSpacing: "0.2em", color: profile.color, fontWeight: 700 }}>{profile.riskLevel}</span>
                    </div>
                    <div style={{ fontSize: 96, fontWeight: 900, color: profile.color, lineHeight: 1, fontFamily: "monospace", marginBottom: 4, textShadow: `0 0 40px ${profile.color}55` }}>
                        {profile.total}
                    </div>
                    <div style={{ fontSize: 11, color: B.greyDark, letterSpacing: "0.14em", marginBottom: 14, fontFamily: "monospace" }}>OUT OF 100</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: B.white, marginBottom: 6 }}>{profile.tier}</div>
                    <div style={{ fontSize: 13, color: B.grey, letterSpacing: "0.06em" }}>{profile.tagline}</div>
                </div>

                <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 20px", width: "100%", boxSizing: "border-box" }}>

                    {/* Description */}
                    <div style={{ background: B.white, border: `1px solid ${B.lightGrey}`, borderLeft: `4px solid ${profile.color}`, borderRadius: 10, padding: "22px 24px", marginBottom: 20 }}>
                        <p style={{ color: B.greyDark, fontSize: 14, lineHeight: 1.75, margin: 0 }}>{profile.description}</p>
                    </div>

                    {/* Charts */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                        <div style={{ background: B.white, border: `1px solid ${B.lightGrey}`, borderRadius: 10, padding: "20px 12px" }}>
                            <div style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.16em", color: B.gold, textTransform: "uppercase", fontWeight: 700, marginBottom: 8, paddingLeft: 8 }}>Dimension Radar</div>
                            <ResponsiveContainer width="100%" height={240}>
                                <RadarChart data={radarData} margin={{ top: 24, right: 52, bottom: 24, left: 52 }}>
                                    <PolarGrid stroke={B.lightGrey} />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: B.greyDark, fontSize: 9, fontFamily: "monospace" }} />
                                    <Radar dataKey="value" stroke={profile.color} fill={profile.color} fillOpacity={0.18} strokeWidth={2} dot={{ fill: profile.color, r: 3 }} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ background: B.white, border: `1px solid ${B.lightGrey}`, borderRadius: 10, padding: "20px 12px" }}>
                            <div style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.16em", color: B.gold, textTransform: "uppercase", fontWeight: 700, marginBottom: 8, paddingLeft: 8 }}>Category Scores</div>
                            <ResponsiveContainer width="100%" height={240}>
                                <BarChart data={barData} margin={{ top: 10, right: 8, bottom: 28, left: -12 }}>
                                    <XAxis dataKey="name" tick={{ fill: B.greyDark, fontSize: 9, fontFamily: "monospace" }} axisLine={false} tickLine={false} />
                                    <YAxis domain={[0, 100]} tick={{ fill: B.grey, fontSize: 9 }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ background: B.navy, border: `1px solid ${B.gold}44`, borderRadius: 8, color: B.white, fontFamily: "monospace", fontSize: 12 }}
                                        cursor={{ fill: `${B.navy}10` }}
                                        formatter={(v) => [`${v}/100`, "Score"]}
                                    />
                                    <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                                        {barData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Dimension breakdown */}
                    <div style={{ background: B.white, border: `1px solid ${B.lightGrey}`, borderRadius: 10, padding: "22px 24px", marginBottom: 16 }}>
                        <div style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.18em", color: B.gold, textTransform: "uppercase", fontWeight: 700, marginBottom: 18 }}>Dimension Breakdown</div>
                        {CATEGORIES.map((cat, i) => {
                            const score = profile.catScores[cat] || 0;
                            return (
                                <div key={cat} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
                                    <span style={{ fontSize: 11, fontFamily: "monospace", color: B.greyDark, width: 176, flexShrink: 0 }}>{cat}</span>
                                    <div style={{ flex: 1, height: 6, background: B.lightGrey, borderRadius: 100, overflow: "hidden" }}>
                                        <div style={{ height: "100%", width: `${score}%`, background: CAT_BAR_COLORS[i], borderRadius: 100 }} />
                                    </div>
                                    <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: B.navy, width: 36, textAlign: "right" }}>{score}</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Key Findings */}
                    <div style={{ background: B.white, border: `1px solid ${B.lightGrey}`, borderRadius: 10, padding: "22px 24px", marginBottom: 16 }}>
                        <div style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.18em", color: B.gold, textTransform: "uppercase", fontWeight: 700, marginBottom: 18 }}>Key Findings</div>
                        {profile.findings.map((f, i) => (
                            <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 13 }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: B.gold, flexShrink: 0, marginTop: 5 }} />
                                <span style={{ fontSize: 13, color: B.greyDark, lineHeight: 1.65 }}>{f}</span>
                            </div>
                        ))}
                    </div>

                    {/* Recommended Actions */}
                    <div style={{ background: B.navy, border: `1px solid ${B.navyLight}`, borderRadius: 10, padding: "22px 24px", marginBottom: 28 }}>
                        <div style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.18em", color: B.gold, textTransform: "uppercase", fontWeight: 700, marginBottom: 18 }}>Recommended Actions</div>
                        {profile.actions.map((a, i) => (
                            <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 14 }}>
                                <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: B.gold, flexShrink: 0, marginTop: 2 }}>{String(i + 1).padStart(2, "0")}</span>
                                <span style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.7 }}>{a}</span>
                            </div>
                        ))}
                    </div>

                    {/* CTA */}
                    <div style={{ background: B.white, border: `1px solid ${B.lightGrey}`, borderRadius: 10, padding: "28px 24px", textAlign: "center", marginBottom: 20 }}>
                        <p style={{ fontSize: 11, letterSpacing: "0.1em", color: B.gold, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Ready to Improve Your Score?</p>
                        <h3 style={{ fontSize: 20, fontWeight: 700, color: B.navy, marginBottom: 12 }}>Talk to a Bizcom AI Governance Expert</h3>
                        <p style={{ fontSize: 13, color: B.greyDark, marginBottom: 20, lineHeight: 1.6 }}>Our ISO 42001 Lead Implementer certified team can help you design, implement, and maintain your AI governance framework.</p>
                        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                            <a href="https://bizcomgrp.com/contact/" target="_blank" rel="noreferrer" style={{ background: B.gold, color: B.navy, fontWeight: 700, fontSize: 13, padding: "12px 28px", borderRadius: 7, textDecoration: "none", letterSpacing: "0.05em" }}>
                                Contact Us →
                            </a>
                            <button onClick={downloadPDF} style={{ background: B.navy, color: B.white, border: "none", fontSize: 13, padding: "12px 24px", borderRadius: 7, cursor: "pointer", letterSpacing: "0.04em", fontWeight: 700 }}>
                                {pdfGenerating ? "Generating..." : "Download Report PDF"}
                            </button>
                            <button onClick={restart} style={{ background: "transparent", border: `1px solid ${B.lightGrey}`, color: B.greyDark, fontSize: 13, padding: "12px 24px", borderRadius: 7, cursor: "pointer", letterSpacing: "0.04em" }}>
                                ↺ Retake Assessment
                            </button>
                        </div>
                    </div>
                </div>

                <Footer />
            </div>
        );
    }

    // ══════════════════════════════════════════
    // QUIZ
    // ══════════════════════════════════════════
    const catIdx = CATEGORIES.indexOf(q?.category);

    return (
        <div style={{ minHeight: "100vh", background: B.offWhite, display: "flex", flexDirection: "column", fontFamily: "sans-serif" }}>
            <NavBar showContact={false} />

            {/* Progress strip */}
            <div style={{ background: B.navy, padding: "16px 24px 0" }}>
                <div style={{ maxWidth: 700, margin: "0 auto" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: B.gold }} />
                            <span style={{ fontSize: 10, letterSpacing: "0.14em", color: B.gold, textTransform: "uppercase", fontWeight: 600 }}>{q.category}</span>
                        </div>
                        <span style={{ fontSize: 12, fontFamily: "monospace", color: B.grey }}>
                            <span style={{ color: B.white, fontWeight: 700 }}>{current + 1}</span> / {QUESTIONS.length}
                        </span>
                    </div>
                    <div style={{ height: 3, background: B.navyLight, borderRadius: 100, overflow: "hidden", marginBottom: 0 }}>
                        <div style={{ height: "100%", width: `${progress}%`, background: B.gold, borderRadius: 100, transition: "width 0.4s ease" }} />
                    </div>
                    <div style={{ display: "flex", gap: 3, paddingTop: 6, paddingBottom: 0 }}>
                        {CATEGORIES.map((cat, i) => {
                            const done = QUESTIONS.filter(qq => qq.category === cat).every(qq => answers[qq.id] !== undefined);
                            const active = cat === q.category;
                            return <div key={cat} title={cat} style={{ flex: 1, height: 3, borderRadius: 100, background: active ? B.gold : done ? `${B.gold}66` : `${B.navyLight}`, transition: "all 0.3s" }} />;
                        })}
                    </div>
                </div>
            </div>

            {/* Question area */}
            <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 20px" }}>
                <div style={{ maxWidth: 700, width: "100%", opacity: animIn ? 1 : 0, transform: animIn ? "translateY(0)" : "translateY(14px)", transition: "opacity 0.26s ease, transform 0.26s ease" }}>

                    <div style={{ background: B.white, border: `1px solid ${B.lightGrey}`, borderRadius: 14, padding: "36px 32px", marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                        <div style={{ fontSize: 10, fontFamily: "monospace", color: B.lightGrey, letterSpacing: "0.14em", marginBottom: 12, fontWeight: 700 }}>
                            QUESTION {String(current + 1).padStart(2, "0")} OF {QUESTIONS.length}
                        </div>
                        <h2 style={{ fontSize: "clamp(16px, 2.6vw, 20px)", color: B.navy, fontWeight: 700, lineHeight: 1.5, margin: "0 0 28px", letterSpacing: "-0.01em" }}>
                            {q.text}
                        </h2>

                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {q.options.map((opt, i) => {
                                const isSel = selected === i;
                                return (
                                    <button
                                        key={i}
                                        onClick={() => setSelected(i)}
                                        style={{
                                            display: "flex", alignItems: "flex-start", gap: 14,
                                            background: isSel ? `${B.gold}10` : B.offWhite,
                                            border: `2px solid ${isSel ? B.gold : B.lightGrey}`,
                                            borderRadius: 10, padding: "14px 16px", cursor: "pointer",
                                            textAlign: "left", transition: "all 0.18s", outline: "none"
                                        }}
                                    >
                                        <span style={{
                                            width: 28, height: 28, borderRadius: 7, flexShrink: 0, marginTop: 1,
                                            background: isSel ? B.gold : B.white,
                                            border: `2px solid ${isSel ? B.gold : B.lightGrey}`,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            fontSize: 11, fontFamily: "monospace", fontWeight: 700,
                                            color: isSel ? B.navy : B.grey,
                                            transition: "all 0.18s",
                                        }}>
                                            {isSel ? "✓" : String.fromCharCode(65 + i)}
                                        </span>
                                        <span style={{ fontSize: 13, color: isSel ? B.navy : B.greyDark, lineHeight: 1.55, flex: 1, fontWeight: isSel ? 600 : 400 }}>
                                            {opt}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Nav buttons */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <button onClick={back} style={{ background: "transparent", border: `1px solid ${B.lightGrey}`, color: B.greyDark, borderRadius: 8, padding: "12px 22px", cursor: "pointer", fontSize: 12, letterSpacing: "0.04em" }}>
                            ← Back
                        </button>
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: B.grey }}>
                            {Object.keys(answers).length} of {QUESTIONS.length} answered
                        </span>
                        <button
                            onClick={next}
                            disabled={selected === null}
                            style={{
                                background: selected !== null ? B.gold : B.lightGrey,
                                color: selected !== null ? B.navy : B.grey,
                                border: "none", borderRadius: 8, padding: "12px 26px",
                                fontSize: 13, fontWeight: 700, letterSpacing: "0.05em",
                                cursor: selected !== null ? "pointer" : "not-allowed",
                                transition: "all 0.2s",
                                boxShadow: selected !== null ? `0 4px 16px ${B.gold}44` : "none",
                            }}
                        >
                            {current + 1 === QUESTIONS.length ? "View My Profile →" : "Next →"}
                        </button>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}

// ─── MOUNT ────────────────────────────────────────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);