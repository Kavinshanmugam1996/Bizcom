const { useState, useEffect, useCallback } = React;
const {
    RadarChart, PolarGrid, PolarAngleAxis, Radar,
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} = Recharts;

// ─── BIZCOM BRAND TOKENS ──────────────────────────────────────────────────────
const B = {
    navy:      "#0B1D33",
    navyMid:   "#112540",
    navyLight: "#1A3355",
    gold:      "#C49B2C",
    goldLight: "#D4A843",
    goldDim:   "#8B6D1E",
    white:     "#FFFFFF",
    offWhite:  "#F4F6F9",
    lightGrey: "#E8EDF3",
    grey:      "#8A9BB0",
    greyDark:  "#4A5E72",
    greyDeep:  "#2A3D52",
    logoUrl:   "https://bizcomgrp.com/wp-content/uploads/2023/09/bizcom_bizcom.png",
};

const SEVERITY_COLORS = {
    Critical:     "#E53E3E",
    High:         "#DD6B20",
    Medium:       "#D69E2E",
    Low:          "#38A169",
    "No Risk Data": "#718096",
};

const TIER_COLORS = {
    "Oversight Leader":    "#38A169",
    "Governance Mature":   "#3182CE",
    "Developing Controls": "#D69E2E",
    "Early Stage":         "#DD6B20",
    "Critical Exposure":   "#E53E3E",
};

// ─── 13 COMPONENT GROUPS ──────────────────────────────────────────────────────
const COMPONENT_GROUPS = [
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
];

const COMPONENT_ICONS = {
    "Data Processing":               "⚙️",
    "Knowledge Base":                "📚",
    "Embeddings":                    "🔢",
    "Vector Database":               "🗄️",
    "Retrieval (RAG)":               "🔍",
    "Prompt Engineering":            "✍️",
    "LLM / Model Layer":             "🧠",
    "Orchestration / Agents":        "🤖",
    "Tools & API Integrations":      "🔗",
    "Application Layer":             "📱",
    "Guardrails / Safety":           "🛡️",
    "Monitoring & Evaluation":       "📊",
    "Feedback & Continuous Learning":"🔄",
};

// ─── TIER LOGIC ───────────────────────────────────────────────────────────────
function getTierInfo(score) {
    if (score >= 80) return {
        tier: "Oversight Leader", riskLevel: "LOW RISK", color: TIER_COLORS["Oversight Leader"],
        tagline: "Exemplary AI governance maturity",
        description: "Your organisation demonstrates exceptional AI oversight. Robust controls, strong accountability, and a mature risk culture place you in the top tier — consistent with ISO 42001 best practice.",
        findings: [
            "Comprehensive governance frameworks are well embedded and consistently enforced",
            "AI risks are systematically identified, rated, and mitigated across all systems",
            "Human oversight mechanisms are operational, documented, and regularly tested",
            "Ethical principles are operationalised and validated through independent audits",
        ],
        // actions removed
    };
    if (score >= 60) return {
        tier: "Governance Mature", riskLevel: "LOW-MEDIUM RISK", color: TIER_COLORS["Governance Mature"],
        tagline: "Strong foundations with targeted gaps",
        description: "Your organisation has solid AI governance structures in place. Most controls are operational and leadership is engaged. A focused number of gaps exist — particularly around third-party AI oversight or technical monitoring depth.",
        findings: [
            "Core governance policies are documented and broadly adopted",
            "Risk assessments are conducted but may lack depth or coverage for all systems",
            "Human-in-the-loop controls exist for most high-stakes decisions",
            "Ethics principles are documented but not yet independently validated",
        ],
        // actions removed
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
        // actions removed
    };
    if (score >= 20) return {
        tier: "Early Stage", riskLevel: "HIGH RISK", color: TIER_COLORS["Early Stage"],
        tagline: "Significant gaps requiring urgent attention",
        description: "Your organisation's AI oversight posture presents material risk. Governance is largely informal, risk assessment is limited, and operational controls are insufficient for the AI systems likely in use.",
        findings: [
            "No comprehensive AI governance framework is in place",
            "AI risks are not systematically identified, classified, or managed",
            "AI systems may be operating without adequate human oversight or monitoring",
            "Legal and regulatory compliance cannot be reliably demonstrated",
        ],
        // actions removed
    };
    return {
        tier: "Critical Exposure", riskLevel: "CRITICAL RISK", color: TIER_COLORS["Critical Exposure"],
        tagline: "Immediate executive intervention required",
        description: "Your organisation's AI oversight posture represents a critical risk. The absence of governance, controls, and accountability creates severe regulatory, reputational, and operational exposure.",
        findings: [
            "No AI governance structure or policy of any kind exists",
            "AI systems are deployed without risk assessment, classification, or documentation",
            "No human oversight mechanisms are in place for any AI-driven decisions",
            "Ethics, privacy, and regulatory compliance are entirely unaddressed",
        ],
        // actions removed
    };
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function BizcomLogo({ style = {} }) {
    return (
        <img src={B.logoUrl} alt="Bizcom"
            style={{ height: 44, objectFit: "contain", ...style }}
            onError={e => { e.target.style.display = "none"; }} />
    );
}

function NavBar({ showContact = true, step = null }) {
    const steps = ["Profile", "Inventory", "Assessment", "Report"];
    return (
        <div style={{ background: B.navy, borderBottom: `1px solid ${B.navyLight}`, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 68, boxSizing: "border-box", position: "sticky", top: 0, zIndex: 100 }}>
            <BizcomLogo />
            {step !== null && (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {steps.map((s, i) => {
                        const active  = i === step;
                        const done    = i < step;
                        return (
                            <React.Fragment key={s}>
                                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                    <div style={{
                                        width: 22, height: 22, borderRadius: "50%",
                                        background: done ? B.gold : active ? B.gold : "transparent",
                                        border: `2px solid ${done || active ? B.gold : B.navyLight}`,
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: 9, fontWeight: 700,
                                        color: done || active ? B.navy : B.grey,
                                    }}>
                                        {done ? "✓" : i + 1}
                                    </div>
                                    <span style={{ fontSize: 10, color: active ? B.gold : done ? B.grey : B.greyDeep, fontWeight: active ? 700 : 400, letterSpacing: "0.06em" }}>{s}</span>
                                </div>
                                {i < steps.length - 1 && (
                                    <div style={{ width: 20, height: 1, background: done ? B.gold : B.navyLight }} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            )}
            {showContact && (
                <a href="https://bizcomgrp.com/contact/" target="_blank" rel="noreferrer"
                    style={{ background: B.gold, color: B.navy, fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", padding: "9px 20px", borderRadius: 6, textDecoration: "none" }}>
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
            <p style={{ fontSize: 11, color: B.greyDark, margin: 0, letterSpacing: "0.03em" }}>
                © 2026 Bizcom – Building AI Governance Frameworks for Tomorrow.
            </p>
            <a href="https://bizcomgrp.com" target="_blank" rel="noreferrer"
                style={{ fontSize: 11, color: B.gold, textDecoration: "none", letterSpacing: "0.04em" }}>
                bizcomgrp.com →
            </a>
        </div>
    );
}

function FieldRow({ label, children }) {
    return (
        <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: B.greyDark, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>{label}</label>
            {children}
        </div>
    );
}

function Input({ value, onChange, placeholder, type = "text" }) {
    return (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${B.lightGrey}`, borderRadius: 8, fontSize: 13, color: B.navy, background: B.white, outline: "none", boxSizing: "border-box", fontFamily: "sans-serif" }} />
    );
}

function Select({ value, onChange, options }) {
    return (
        <select value={value} onChange={e => onChange(e.target.value)}
            style={{ width: "100%", padding: "10px 14px", border: `1.5px solid ${B.lightGrey}`, borderRadius: 8, fontSize: 13, color: B.navy, background: B.white, outline: "none", boxSizing: "border-box", fontFamily: "sans-serif", cursor: "pointer" }}>
            <option value="">— Select —</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
    );
}

function GoldBtn({ onClick, disabled, children, outline = false }) {
    return (
        <button onClick={onClick} disabled={disabled}
            style={{
                background: outline ? "transparent" : disabled ? B.lightGrey : B.gold,
                color: outline ? B.greyDark : disabled ? B.grey : B.navy,
                border: outline ? `1px solid ${B.lightGrey}` : "none",
                borderRadius: 8, padding: "12px 28px", fontSize: 13, fontWeight: 700,
                letterSpacing: "0.05em", cursor: disabled ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                boxShadow: !outline && !disabled ? `0 4px 16px ${B.gold}44` : "none",
            }}>
            {children}
        </button>
    );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function App() {
    // Phases: "login" → "intro" → "profile" → "inventory" → "quiz" → "result"
    const initialToken = localStorage.getItem("bizcom_token") || null;
    const [token, setToken] = useState(initialToken);
    const [phase,   setPhase]   = useState(initialToken ? "intro" : "login");
    const [animIn,  setAnimIn]  = useState(true);

    // Auth
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPass, setLoginPass] = useState("");
    const [loginError, setLoginError] = useState("");
    const [loggingIn, setLoggingIn] = useState(false);

    // Step 1 — Company Profile
    const [company, setCompany] = useState({
        company_name: "", industry: "", company_size: "",
        regulatory_region: "", ai_maturity_level: "",
        assessor_name: "", assessor_email: "", assessor_role: "",
    });

    // Step 2 — AI Inventory (selected component groups + system entries)
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [inventory, setInventory]           = useState([]);

    // Step 3 — Quiz
    const [questions,  setQuestions]  = useState([]);
    const [loadingQ,   setLoadingQ]   = useState(false);
    const [loadError,  setLoadError]  = useState(null);
    const [current,    setCurrent]    = useState(0);
    const [answers,    setAnswers]    = useState({});
    const [selected,   setSelected]   = useState(null);

    // Step 4 — Result
    const [profile,       setProfile]       = useState(null);
    const [reportData,    setReportData]    = useState(null);
    const [pdfGenerating, setPdfGenerating] = useState(false);

    // ── helpers ──────────────────────────────────────────────────────────────
    function goTo(nextPhase) {
        setAnimIn(false);
        setTimeout(() => { setPhase(nextPhase); setAnimIn(true); }, 240);
    }

    const stepIndex = { intro: -1, profile: 0, inventory: 1, quiz: 2, result: 3 };

    // ── load filtered questions from backend ─────────────────────────────────
    async function loadFilteredQuestions(groups) {
        setLoadingQ(true);
        setLoadError(null);
        try {
            const res = await fetch("/api/questions/filtered", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
                body: JSON.stringify({ selected_groups: groups }),
            });
            if (!res.ok) throw new Error(`Server error ${res.status}`);
            const data = await res.json();
            setQuestions(data.data || []);
        } catch (e) {
            setLoadError(e.message);
        }
        setLoadingQ(false);
    }

    // ── quiz navigation ───────────────────────────────────────────────────────
    const q = questions[current] || null;

    function next() {
        if (selected === null) return;
        const updated = { ...answers, [q.qid_code]: { answer: selected, weight: q.total_weight || 1.0, max_risk_score: q.max_risk_score || 10.0, component_group: q.component_group } };
        setAnswers(updated);
        setAnimIn(false);
        setTimeout(() => {
            if (current + 1 < questions.length) {
                setCurrent(c => c + 1);
                setSelected(null);
                setAnimIn(true);
            } else {
                submitAssessment(updated);
            }
        }, 240);
    }

    function back() {
        if (current === 0) { goTo("inventory"); return; }
        setAnimIn(false);
        setTimeout(() => {
            const prev = current - 1;
            setCurrent(prev);
            const prevQ = questions[prev];
            setSelected(answers[prevQ?.qid_code]?.answer ?? null);
            setAnimIn(true);
        }, 240);
    }

    // ── score and submit ──────────────────────────────────────────────────────
    async function submitAssessment(finalAnswers) {
        const responses = Object.entries(finalAnswers).map(([qid, data]) => ({
            question_id:    qid,
            answer:         data.answer,
            weight:         data.weight,
            max_risk_score: data.max_risk_score,
            component_group: data.component_group,
        }));

        try {
            const res = await fetch("/api/generate-report", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
                body: JSON.stringify({
                    company,
                    inventory,
                    responses,
                }),
            });
            if (!res.ok) throw new Error("Report generation failed");
            const report = await res.json();

            // Compute governance score → tier
            const govScore = report.governance_score || 0;
            const tierInfo = getTierInfo(govScore);

            setReportData(report);
            setProfile({ ...tierInfo, total: govScore, responses });
            goTo("result");
        } catch (e) {
            alert("Error generating report: " + e.message);
        }
    }

    // ── PDF download ──────────────────────────────────────────────────────────
    async function downloadPDF() {
        if (!profile || !reportData) return;
        setPdfGenerating(true);
        try {
            const responses = Object.entries(answers).map(([qid, data]) => ({
                question_id:    qid,
                answer:         data.answer,
                weight:         data.weight,
                max_risk_score: data.max_risk_score,
                component_group: data.component_group,
            }));

            const res = await fetch("/api/download-report", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
                body: JSON.stringify({
                    company, inventory, responses,
                    score:       profile.total,
                    tier:        profile.tier,
                    risk_level:  profile.riskLevel,
                    tagline:     profile.tagline,
                    description: profile.description,
                    findings:    profile.findings,
                    actions:     profile.actions || [],
                }),
            });
            if (!res.ok) throw new Error("PDF generation failed");
            const blob = await res.blob();
            const url  = window.URL.createObjectURL(blob);
            const a    = document.createElement("a");
            a.href     = url;
            a.download = "Bizcom_AI_Risk_Report.pdf";
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (e) {
            alert("Error: " + e.message);
        }
        setPdfGenerating(false);
    }

    function restart() {
        setPhase("intro"); setCompany({ company_name:"",industry:"",company_size:"",regulatory_region:"",ai_maturity_level:"",assessor_name:"",assessor_email:"",assessor_role:"" });
        setSelectedGroups([]); setInventory([]); setQuestions([]); setAnswers({});
        setCurrent(0); setSelected(null); setProfile(null); setReportData(null); setAnimIn(true);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // INTRO
    // ══════════════════════════════════════════════════════════════════════════
    if (phase === "intro") return (
        <div style={{ minHeight: "100vh", background: B.offWhite, display: "flex", flexDirection: "column", fontFamily: "sans-serif" }}>
            <NavBar />
            <div style={{ background: B.navy, padding: "64px 24px 56px", textAlign: "center" }}>
                <div style={{ display: "inline-block", background: `${B.gold}22`, border: `1px solid ${B.gold}55`, borderRadius: 4, padding: "5px 16px", marginBottom: 20 }}>
                    <span style={{ fontSize: 10, letterSpacing: "0.22em", color: B.gold, textTransform: "uppercase", fontWeight: 600 }}>AI Governance Diagnostic</span>
                </div>
                <h1 style={{ fontSize: "clamp(32px,5vw,52px)", fontWeight: 800, color: B.white, margin: "0 0 8px", letterSpacing: "-0.02em" }}>AI Oversight</h1>
                <h1 style={{ fontSize: "clamp(32px,5vw,52px)", fontWeight: 800, color: B.gold, margin: "0 0 24px", letterSpacing: "-0.02em" }}>Risk Profiler</h1>
                <p style={{ color: "#94A3B8", fontSize: 16, lineHeight: 1.75, maxWidth: 580, margin: "0 auto 32px" }}>
                    A structured diagnostic built on ISO 42001 and NIST-RMF — assessing your organisation's AI oversight maturity across your actual AI stack. Tell us what AI components you use and we'll ask only the questions that matter.
                </p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 40 }}>
                    {["Tailored to Your AI Stack", "13 Component Groups", "ISO 42001 + NIST RMF + EU AI Act", "Instant Risk Report"].map(t => (
                        <span key={t} style={{ fontSize: 11, color: B.grey, background: `${B.white}08`, border: `1px solid ${B.navyLight}`, borderRadius: 100, padding: "5px 14px", letterSpacing: "0.05em" }}>{t}</span>
                    ))}
                </div>
                <GoldBtn onClick={() => token ? goTo("profile") : goTo("login")}>Begin Assessment →</GoldBtn>
                <p style={{ color: "#3A5069", fontSize: 11, marginTop: 14, letterSpacing: "0.05em" }}>All responses are private · No data stored</p>
            </div>

            {/* How it works */}
            <div style={{ background: B.white, padding: "48px 24px" }}>
                <div style={{ maxWidth: 860, margin: "0 auto" }}>
                    <p style={{ textAlign: "center", fontSize: 11, letterSpacing: "0.18em", color: B.gold, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>How It Works</p>
                    <h2 style={{ textAlign: "center", fontSize: 24, fontWeight: 700, color: B.navy, marginBottom: 32 }}>Four Steps to Your Risk Profile</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
                        {[
                            { step: "01", title: "Company Profile",    desc: "Tell us about your organisation, industry, and the assessor." },
                            { step: "02", title: "AI Inventory",       desc: "Select the AI components your organisation actually uses." },
                            { step: "03", title: "Targeted Questions", desc: "Answer only the questions relevant to your AI stack." },
                            { step: "04", title: "Risk Report",        desc: "Receive a scored risk profile with compliance gaps and actions." },
                        ].map(({ step, title, desc }) => (
                            <div key={step} style={{ background: B.offWhite, border: `1px solid ${B.lightGrey}`, borderLeft: `4px solid ${B.gold}`, borderRadius: 10, padding: "20px 18px" }}>
                                <div style={{ fontSize: 22, fontWeight: 800, color: B.gold, fontFamily: "monospace", marginBottom: 6 }}>{step}</div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: B.navy, marginBottom: 4 }}>{title}</div>
                                <div style={{ fontSize: 11, color: B.greyDark, lineHeight: 1.6 }}>{desc}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );

    // ══════════════════════════════════════════════════════════════════════════
    // LOGIN
    // ══════════════════════════════════════════════════════════════════════════
    async function doLogin() {
        if (!loginEmail || !loginPass) {
            setLoginError("Please enter email and password.");
            return;
        }
        setLoggingIn(true);
        setLoginError("");
        try {
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: loginEmail, password: loginPass })
            });
            if (!res.ok) throw new Error("Invalid email or password");
            const data = await res.json();
            localStorage.setItem("bizcom_token", data.access_token);
            setToken(data.access_token);
            goTo("intro");
        } catch(e) {
            setLoginError(e.message);
        }
        setLoggingIn(false);
    }

    if (phase === "login") return (
        <div style={{ minHeight: "100vh", background: B.offWhite, display: "flex", flexDirection: "column", fontFamily: "sans-serif" }}>
            <NavBar step={null} />
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
                <div style={{ maxWidth: 420, width: "100%", opacity: animIn ? 1 : 0, transform: animIn ? "translateY(0)" : "translateY(14px)", transition: "opacity 0.26s, transform 0.26s" }}>
                    <div style={{ background: B.white, border: `1px solid ${B.lightGrey}`, borderRadius: 14, padding: "40px", boxShadow: "0 8px 32px rgba(11,29,51,0.08)", textAlign: "center" }}>
                        <div style={{ width: 48, height: 48, background: `${B.gold}22`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                            <span style={{ fontSize: 24 }}>🔒</span>
                        </div>
                        <h2 style={{ fontSize: 24, fontWeight: 700, color: B.navy, margin: "0 0 8px" }}>Assessor Login</h2>
                        <p style={{ fontSize: 13, color: B.greyDark, marginBottom: 28 }}>Secure authentication for AI Risk Governance</p>
                        
                        {loginError && <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px", borderRadius: 6, fontSize: 13, marginBottom: 20 }}>{loginError}</div>}
                        
                        <div style={{ textAlign: "left", marginBottom: 16 }}>
                            <FieldRow label="Email Address">
                                <Input value={loginEmail} onChange={setLoginEmail} placeholder="you@bizcomgrp.com" type="email" />
                            </FieldRow>
                        </div>
                        <div style={{ textAlign: "left", marginBottom: 28 }}>
                            <FieldRow label="Password">
                                <Input value={loginPass} onChange={setLoginPass} placeholder="••••••••" type="password" />
                            </FieldRow>
                        </div>
                        <GoldBtn onClick={doLogin} disabled={loggingIn}>
                            {loggingIn ? "Authenticating..." : "Sign In →"}
                        </GoldBtn>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 1 — COMPANY PROFILE
    // ══════════════════════════════════════════════════════════════════════════
    if (phase === "profile") {
        const profileComplete =
            company.company_name && company.industry && company.company_size &&
            company.regulatory_region && company.ai_maturity_level &&
            company.assessor_name && company.assessor_email;

        const f = (key) => (val) => setCompany(prev => ({ ...prev, [key]: val }));

        return (
            <div style={{ minHeight: "100vh", background: B.offWhite, display: "flex", flexDirection: "column", fontFamily: "sans-serif" }}>
                <NavBar step={0} />
                <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px" }}>
                    <div style={{ maxWidth: 680, width: "100%", opacity: animIn ? 1 : 0, transform: animIn ? "translateY(0)" : "translateY(14px)", transition: "opacity 0.26s, transform 0.26s" }}>
                        <div style={{ marginBottom: 28 }}>
                            <span style={{ fontSize: 10, letterSpacing: "0.18em", color: B.gold, fontWeight: 700, textTransform: "uppercase" }}>Step 1 of 3</span>
                            <h2 style={{ fontSize: 24, fontWeight: 700, color: B.navy, margin: "6px 0 4px" }}>Company Profile</h2>
                            <p style={{ fontSize: 13, color: B.greyDark, margin: 0 }}>Tell us about your organisation so we can contextualise your risk profile.</p>
                        </div>

                        <div style={{ background: B.white, border: `1px solid ${B.lightGrey}`, borderRadius: 14, padding: "32px", marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: B.gold, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>Organisation Details</p>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
                                <FieldRow label="Company Name *"><Input value={company.company_name} onChange={f("company_name")} placeholder="Acme Corp" /></FieldRow>
                                <FieldRow label="Industry *">
                                    <Select value={company.industry} onChange={f("industry")} options={["Financial Services","Healthcare","E-Commerce","Retail","Education","Technology","Manufacturing","Government","Legal","Other"]} />
                                </FieldRow>
                                <FieldRow label="Company Size *">
                                    <Select value={company.company_size} onChange={f("company_size")} options={["Small (1–49)","Medium (50–249)","Large (250–999)","Enterprise (1000+)"]} />
                                </FieldRow>
                                <FieldRow label="Regulatory Region *">
                                    <Select value={company.regulatory_region} onChange={f("regulatory_region")} options={["EU","UK","US","APAC","Middle East","Global / Multi-region","Other"]} />
                                </FieldRow>
                                <div style={{ gridColumn: "1 / -1" }}>
                                    <FieldRow label="AI Maturity Level *">
                                        <Select value={company.ai_maturity_level} onChange={f("ai_maturity_level")} options={["Beginner — exploring AI","Intermediate — some AI in production","Advanced — AI-native organisation"]} />
                                    </FieldRow>
                                </div>
                            </div>
                        </div>

                        <div style={{ background: B.white, border: `1px solid ${B.lightGrey}`, borderRadius: 14, padding: "32px", marginBottom: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                            <p style={{ fontSize: 11, fontWeight: 700, color: B.gold, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>Assessor Details</p>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
                                <FieldRow label="Full Name *"><Input value={company.assessor_name} onChange={f("assessor_name")} placeholder="Jane Smith" /></FieldRow>
                                <FieldRow label="Email Address *"><Input type="email" value={company.assessor_email} onChange={f("assessor_email")} placeholder="jane@company.com" /></FieldRow>
                                <div style={{ gridColumn: "1 / -1" }}>
                                    <FieldRow label="Role / Title"><Input value={company.assessor_role} onChange={f("assessor_role")} placeholder="Chief Risk Officer" /></FieldRow>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <GoldBtn outline onClick={() => goTo("intro")}>← Back</GoldBtn>
                            <GoldBtn disabled={!profileComplete} onClick={() => goTo("inventory")}>Next: AI Inventory →</GoldBtn>
                        </div>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 2 — AI INVENTORY
    // ══════════════════════════════════════════════════════════════════════════
    if (phase === "inventory") {
        function toggleGroup(group) {
            setSelectedGroups(prev =>
                prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
            );
        }

        function handleStartAssessment() {
            if (selectedGroups.length === 0) return;
            loadFilteredQuestions(selectedGroups).then(() => goTo("quiz"));
        }

        return (
            <div style={{ minHeight: "100vh", background: B.offWhite, display: "flex", flexDirection: "column", fontFamily: "sans-serif" }}>
                <NavBar step={1} />
                <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px" }}>
                    <div style={{ maxWidth: 780, width: "100%", opacity: animIn ? 1 : 0, transform: animIn ? "translateY(0)" : "translateY(14px)", transition: "opacity 0.26s, transform 0.26s" }}>
                        <div style={{ marginBottom: 28 }}>
                            <span style={{ fontSize: 10, letterSpacing: "0.18em", color: B.gold, fontWeight: 700, textTransform: "uppercase" }}>Step 2 of 3</span>
                            <h2 style={{ fontSize: 24, fontWeight: 700, color: B.navy, margin: "6px 0 4px" }}>AI Inventory</h2>
                            <p style={{ fontSize: 13, color: B.greyDark, margin: 0 }}>Select the AI component groups your organisation currently uses. You'll only be assessed on questions relevant to your selection.</p>
                        </div>

                        <div style={{ background: B.white, border: `1px solid ${B.lightGrey}`, borderRadius: 14, padding: "32px", marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                                <p style={{ fontSize: 11, fontWeight: 700, color: B.gold, letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>Select Your AI Components</p>
                                <span style={{ fontSize: 11, fontFamily: "monospace", color: B.grey }}>
                                    {selectedGroups.length} / {COMPONENT_GROUPS.length} selected
                                </span>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                                {COMPONENT_GROUPS.map(group => {
                                    const isSelected = selectedGroups.includes(group);
                                    return (
                                        <button key={group} onClick={() => toggleGroup(group)}
                                            style={{
                                                display: "flex", alignItems: "center", gap: 10,
                                                background: isSelected ? `${B.gold}12` : B.offWhite,
                                                border: `2px solid ${isSelected ? B.gold : B.lightGrey}`,
                                                borderRadius: 10, padding: "12px 14px", cursor: "pointer",
                                                textAlign: "left", transition: "all 0.18s", outline: "none",
                                            }}>
                                            <span style={{ fontSize: 18, flexShrink: 0 }}>{COMPONENT_ICONS[group]}</span>
                                            <span style={{ fontSize: 12, color: isSelected ? B.navy : B.greyDark, fontWeight: isSelected ? 700 : 400, lineHeight: 1.4 }}>{group}</span>
                                            {isSelected && <span style={{ marginLeft: "auto", color: B.gold, fontWeight: 700, fontSize: 14 }}>✓</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {selectedGroups.length > 0 && (
                            <div style={{ background: `${B.gold}10`, border: `1px solid ${B.gold}44`, borderRadius: 10, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ fontSize: 18 }}>📋</span>
                                <span style={{ fontSize: 13, color: B.greyDark }}>
                                    You'll be assessed on questions specifically for: <strong style={{ color: B.navy }}>{selectedGroups.join(", ")}</strong>
                                </span>
                            </div>
                        )}

                        {loadError && (
                            <div style={{ background: "#FFF5F5", border: "1px solid #FC8181", borderRadius: 10, padding: "12px 16px", marginBottom: 16, color: "#C53030", fontSize: 13 }}>
                                ⚠️ {loadError}
                            </div>
                        )}

                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <GoldBtn outline onClick={() => goTo("profile")}>← Back</GoldBtn>
                            <GoldBtn disabled={selectedGroups.length === 0 || loadingQ} onClick={handleStartAssessment}>
                                {loadingQ ? "Loading Questions..." : `Start Assessment (${selectedGroups.length} groups) →`}
                            </GoldBtn>
                        </div>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 3 — QUIZ
    // ══════════════════════════════════════════════════════════════════════════
    if (phase === "quiz") {
        if (loadingQ || questions.length === 0) return (
            <div style={{ minHeight: "100vh", background: B.offWhite, display: "flex", flexDirection: "column", fontFamily: "sans-serif" }}>
                <NavBar step={2} />
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                        <p style={{ color: B.greyDark, fontSize: 14 }}>Loading your personalised question set...</p>
                    </div>
                </div>
            </div>
        );

        const progress    = (current / questions.length) * 100;
        const answeredCount = Object.keys(answers).length;
        const severity    = q?.severity || "Medium";
        const sevColor    = SEVERITY_COLORS[severity] || B.grey;

        // Build response options based on response_type
        const responseType = q?.response_type || "Yes/No";
        let options = [];
        if (responseType.includes("Partial") && responseType.includes("NA")) {
            options = ["Yes", "Partial", "No", "NA"];
        } else if (responseType.includes("Partial")) {
            options = ["Yes", "Partial", "No"];
        } else if (responseType.includes("Describe")) {
            options = ["Yes", "Partial", "No"];
        } else {
            options = ["Yes", "No"];
        }

        return (
            <div style={{ minHeight: "100vh", background: B.offWhite, display: "flex", flexDirection: "column", fontFamily: "sans-serif" }}>
                <NavBar step={2} showContact={false} />

                {/* Progress strip */}
                <div style={{ background: B.navy, padding: "14px 24px 0" }}>
                    <div style={{ maxWidth: 700, margin: "0 auto" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 6, height: 6, borderRadius: "50%", background: B.gold }} />
                                <span style={{ fontSize: 10, letterSpacing: "0.14em", color: B.gold, textTransform: "uppercase", fontWeight: 600 }}>{q?.component_group}</span>
                                <span style={{ fontSize: 9, letterSpacing: "0.08em", color: sevColor, background: `${sevColor}22`, border: `1px solid ${sevColor}44`, borderRadius: 4, padding: "2px 7px", fontWeight: 700 }}>{severity}</span>
                            </div>
                            <span style={{ fontSize: 12, fontFamily: "monospace", color: B.grey }}>
                                <span style={{ color: B.white, fontWeight: 700 }}>{current + 1}</span> / {questions.length}
                            </span>
                        </div>
                        <div style={{ height: 3, background: B.navyLight, borderRadius: 100, overflow: "hidden", marginBottom: 0 }}>
                            <div style={{ height: "100%", width: `${progress}%`, background: B.gold, borderRadius: 100, transition: "width 0.4s ease" }} />
                        </div>
                        {/* Component group mini-pills */}
                        <div style={{ display: "flex", gap: 3, paddingTop: 6, paddingBottom: 0, flexWrap: "wrap" }}>
                            {selectedGroups.map(grp => {
                                const grpQuestions = questions.filter(qq => qq.component_group === grp);
                                const grpAnswered  = grpQuestions.filter(qq => answers[qq.qid_code]).length;
                                const grpDone      = grpAnswered === grpQuestions.length;
                                const grpActive    = q?.component_group === grp;
                                return (
                                    <div key={grp} title={grp}
                                        style={{ flex: "1 0 auto", minWidth: 8, height: 3, borderRadius: 100, background: grpActive ? B.gold : grpDone ? `${B.gold}66` : B.navyLight, transition: "all 0.3s" }} />
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Question area */}
                <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 20px" }}>
                    <div style={{ maxWidth: 700, width: "100%", opacity: animIn ? 1 : 0, transform: animIn ? "translateY(0)" : "translateY(14px)", transition: "opacity 0.26s, transform 0.26s" }}>
                        <div style={{ background: B.white, border: `1px solid ${B.lightGrey}`, borderRadius: 14, padding: "36px 32px", marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                            <div style={{ fontSize: 10, fontFamily: "monospace", color: B.lightGrey, letterSpacing: "0.14em", marginBottom: 12, fontWeight: 700 }}>
                                QUESTION {String(current + 1).padStart(2, "0")} OF {questions.length}
                                <span style={{ marginLeft: 12, color: B.grey }}>ID: {q?.qid_code}</span>
                            </div>
                            <h2 style={{ fontSize: "clamp(15px,2.4vw,19px)", color: B.navy, fontWeight: 700, lineHeight: 1.55, margin: "0 0 28px" }}>
                                {q?.question_text}
                            </h2>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {options.map((opt, i) => {
                                    const isSel = selected === opt;
                                    const optColors = { Yes: "#38A169", Partial: "#D69E2E", No: "#E53E3E", NA: "#718096" };
                                    const optColor  = optColors[opt] || B.gold;
                                    return (
                                        <button key={opt} onClick={() => setSelected(opt)}
                                            style={{
                                                display: "flex", alignItems: "center", gap: 14,
                                                background: isSel ? `${optColor}12` : B.offWhite,
                                                border: `2px solid ${isSel ? optColor : B.lightGrey}`,
                                                borderRadius: 10, padding: "14px 18px", cursor: "pointer",
                                                textAlign: "left", transition: "all 0.18s", outline: "none",
                                            }}>
                                            <span style={{
                                                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                                                background: isSel ? optColor : B.white,
                                                border: `2px solid ${isSel ? optColor : B.lightGrey}`,
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                fontSize: 11, fontWeight: 700,
                                                color: isSel ? B.white : B.grey,
                                                transition: "all 0.18s",
                                            }}>
                                                {isSel ? "✓" : opt[0]}
                                            </span>
                                            <span style={{ fontSize: 13, color: isSel ? B.navy : B.greyDark, lineHeight: 1.5, flex: 1, fontWeight: isSel ? 600 : 400 }}>
                                                {opt === "Yes"     ? "Yes — fully implemented" :
                                                 opt === "Partial" ? "Partial — work in progress or incomplete" :
                                                 opt === "No"      ? "No — not implemented" :
                                                 "Not Applicable"}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Nav */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <GoldBtn outline onClick={back}>← Back</GoldBtn>
                            <span style={{ fontSize: 11, fontFamily: "monospace", color: B.grey }}>
                                {answeredCount} of {questions.length} answered
                            </span>
                            <GoldBtn disabled={selected === null} onClick={next}>
                                {current + 1 === questions.length ? "View My Report →" : "Next →"}
                            </GoldBtn>
                        </div>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STEP 4 — RESULT
    // ══════════════════════════════════════════════════════════════════════════
    if (phase === "result" && profile && reportData) {
        const breakdown  = reportData.component_breakdown || {};
        const radarData  = Object.entries(breakdown).map(([grp, data]) => ({
            subject:  grp.length > 14 ? grp.split(" ").slice(0, 2).join(" ") : grp,
            value:    data.governance_score,
            fullMark: 100,
        }));
        const barData = Object.entries(breakdown).map(([grp, data], i) => ({
            name:  grp.split(" ")[0],
            value: data.governance_score,
            color: ["#C49B2C","#D4A843","#B8872A","#E0B955","#9A7822","#C49B2C","#D4A843","#B8872A","#E0B955","#9A7822","#C49B2C","#D4A843","#B8872A"][i % 13],
        }));

        const topRisks    = (reportData.triggered_risks || []).slice(0, 5);
        const totalGaps   = reportData.total_trigger_points || 0;
        const riskExposure = reportData.risk_exposure_pct || 0;

        return (
            <div style={{ minHeight: "100vh", background: B.offWhite, fontFamily: "sans-serif", display: "flex", flexDirection: "column" }}>
                <NavBar step={3} />

                {/* Score hero */}
                <div style={{ background: B.navy, padding: "48px 24px 40px", textAlign: "center", borderBottom: `3px solid ${profile.color}` }}>
                    <div style={{ fontSize: 11, color: B.grey, marginBottom: 8 }}>
                        {company.company_name && <span style={{ color: B.white, fontWeight: 700 }}>{company.company_name}</span>}
                        {company.industry && <span> · {company.industry}</span>}
                    </div>
                    <div style={{ display: "inline-block", background: `${profile.color}22`, border: `1px solid ${profile.color}55`, borderRadius: 4, padding: "5px 16px", marginBottom: 16 }}>
                        <span style={{ fontSize: 10, letterSpacing: "0.2em", color: profile.color, fontWeight: 700 }}>{profile.riskLevel}</span>
                    </div>
                    <div style={{ fontSize: 96, fontWeight: 900, color: profile.color, lineHeight: 1, fontFamily: "monospace", marginBottom: 4, textShadow: `0 0 40px ${profile.color}55` }}>
                        {Math.round(profile.total)}
                    </div>
                    <div style={{ fontSize: 11, color: B.greyDark, letterSpacing: "0.14em", marginBottom: 14, fontFamily: "monospace" }}>GOVERNANCE SCORE / 100</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: B.white, marginBottom: 6 }}>{profile.tier}</div>
                    <div style={{ fontSize: 13, color: B.grey, letterSpacing: "0.06em", marginBottom: 20 }}>{profile.tagline}</div>

                    {/* Quick stats */}
                    <div style={{ display: "inline-flex", gap: 24, background: `${B.white}08`, border: `1px solid ${B.navyLight}`, borderRadius: 10, padding: "14px 28px" }}>
                        {[
                            { label: "Questions", value: reportData.total_questions_answered },
                            { label: "Gaps Found", value: totalGaps },
                            { label: "Risk Exposure", value: `${riskExposure}%` },
                            { label: "Components Assessed", value: selectedGroups.length },
                        ].map(({ label, value }) => (
                            <div key={label} style={{ textAlign: "center" }}>
                                <div style={{ fontSize: 20, fontWeight: 800, color: B.white, fontFamily: "monospace" }}>{value}</div>
                                <div style={{ fontSize: 9, color: B.grey, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px", width: "100%", boxSizing: "border-box" }}>

                    {/* Description */}
                    <div style={{ background: B.white, border: `1px solid ${B.lightGrey}`, borderLeft: `4px solid ${profile.color}`, borderRadius: 10, padding: "22px 24px", marginBottom: 20 }}>
                        <p style={{ color: B.greyDark, fontSize: 14, lineHeight: 1.75, margin: 0 }}>{profile.description}</p>
                    </div>

                    {/* Charts */}
                    {radarData.length > 0 && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                            <div style={{ background: B.white, border: `1px solid ${B.lightGrey}`, borderRadius: 10, padding: "20px 12px" }}>
                                <div style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.16em", color: B.gold, textTransform: "uppercase", fontWeight: 700, marginBottom: 8, paddingLeft: 8 }}>Governance Radar</div>
                                <ResponsiveContainer width="100%" height={220}>
                                    <RadarChart data={radarData} margin={{ top: 20, right: 48, bottom: 20, left: 48 }}>
                                        <PolarGrid stroke={B.lightGrey} />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: B.greyDark, fontSize: 8, fontFamily: "monospace" }} />
                                        <Radar dataKey="value" stroke={profile.color} fill={profile.color} fillOpacity={0.18} strokeWidth={2} dot={{ fill: profile.color, r: 3 }} />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                            <div style={{ background: B.white, border: `1px solid ${B.lightGrey}`, borderRadius: 10, padding: "20px 12px" }}>
                                <div style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.16em", color: B.gold, textTransform: "uppercase", fontWeight: 700, marginBottom: 8, paddingLeft: 8 }}>Component Scores</div>
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={barData} margin={{ top: 10, right: 8, bottom: 40, left: -12 }}>
                                        <XAxis dataKey="name" tick={{ fill: B.greyDark, fontSize: 8, fontFamily: "monospace" }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" />
                                        <YAxis domain={[0, 100]} tick={{ fill: B.grey, fontSize: 8 }} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={{ background: B.navy, border: `1px solid ${B.gold}44`, borderRadius: 8, color: B.white, fontFamily: "monospace", fontSize: 11 }} cursor={{ fill: `${B.navy}10` }} formatter={v => [`${v.toFixed(1)}/100`, "Governance"]} />
                                        <Bar dataKey="value" radius={[5,5,0,0]}>
                                            {barData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* Component breakdown */}
                    {Object.keys(breakdown).length > 0 && (
                        <div style={{ background: B.white, border: `1px solid ${B.lightGrey}`, borderRadius: 10, padding: "22px 24px", marginBottom: 16 }}>
                            <div style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.18em", color: B.gold, textTransform: "uppercase", fontWeight: 700, marginBottom: 18 }}>Component Breakdown</div>
                            {Object.entries(breakdown).sort((a, b) => a[1].governance_score - b[1].governance_score).map(([grp, data]) => (
                                <div key={grp} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                                    <span style={{ fontSize: 16, flexShrink: 0 }}>{COMPONENT_ICONS[grp] || "•"}</span>
                                    <span style={{ fontSize: 11, fontFamily: "monospace", color: B.greyDark, width: 200, flexShrink: 0 }}>{grp}</span>
                                    <div style={{ flex: 1, height: 6, background: B.lightGrey, borderRadius: 100, overflow: "hidden" }}>
                                        <div style={{ height: "100%", width: `${data.governance_score}%`, background: data.governance_score >= 70 ? "#38A169" : data.governance_score >= 40 ? "#D69E2E" : "#E53E3E", borderRadius: 100 }} />
                                    </div>
                                    <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: B.navy, width: 42, textAlign: "right" }}>{data.governance_score.toFixed(0)}</span>
                                    {data.trigger_points > 0 && <span style={{ fontSize: 10, color: "#E53E3E", fontWeight: 700 }}>{data.trigger_points} gaps</span>}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Top risks */}
                    {topRisks.length > 0 && (
                        <div style={{ background: B.white, border: `1px solid ${B.lightGrey}`, borderRadius: 10, padding: "22px 24px", marginBottom: 16 }}>
                            <div style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.18em", color: B.gold, textTransform: "uppercase", fontWeight: 700, marginBottom: 18 }}>Top Risk Gaps</div>
                            {topRisks.map((risk, i) => (
                                <div key={i} style={{ borderBottom: `1px solid ${B.lightGrey}`, paddingBottom: 14, marginBottom: 14 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                                        <span style={{ fontSize: 9, fontWeight: 700, color: SEVERITY_COLORS[risk.severity] || B.grey, background: `${SEVERITY_COLORS[risk.severity] || B.grey}18`, border: `1px solid ${SEVERITY_COLORS[risk.severity] || B.grey}44`, borderRadius: 4, padding: "2px 7px", letterSpacing: "0.06em" }}>{risk.severity?.toUpperCase()}</span>
                                        <span style={{ fontSize: 9, fontFamily: "monospace", color: B.grey }}>{risk.component_group}</span>
                                        <span style={{ fontSize: 9, fontFamily: "monospace", color: risk.answer === "No" ? "#E53E3E" : "#D69E2E", fontWeight: 700 }}>{risk.answer}</span>
                                    </div>
                                    <p style={{ fontSize: 12, color: B.greyDark, margin: "0 0 5px", lineHeight: 1.5 }}>{risk.question_text}</p>
                                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                                        {risk.iso_42001 && <span style={{ fontSize: 10, color: B.grey }}>📋 {risk.iso_42001}</span>}
                                        {risk.owasp    && <span style={{ fontSize: 10, color: B.grey }}>🔒 {risk.owasp}</span>}
                                        {risk.eu_ai_act && <span style={{ fontSize: 10, color: B.grey }}>🇪🇺 {risk.eu_ai_act}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Key findings */}
                    <div style={{ background: B.white, border: `1px solid ${B.lightGrey}`, borderRadius: 10, padding: "22px 24px", marginBottom: 16 }}>
                        <div style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.18em", color: B.gold, textTransform: "uppercase", fontWeight: 700, marginBottom: 18 }}>Key Findings</div>
                        {profile.findings.map((f, i) => (
                            <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 13 }}>
                                <div style={{ width: 8, height: 8, borderRadius: "50%", background: B.gold, flexShrink: 0, marginTop: 5 }} />
                                <span style={{ fontSize: 13, color: B.greyDark, lineHeight: 1.65 }}>{f}</span>
                            </div>
                        ))}
                    </div>

                    {/* Recommended actions */}
                    {profile.actions && profile.actions.length > 0 && (
                        <div style={{ background: B.navy, border: `1px solid ${B.navyLight}`, borderRadius: 10, padding: "22px 24px", marginBottom: 28 }}>
                            <div style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.18em", color: B.gold, textTransform: "uppercase", fontWeight: 700, marginBottom: 18 }}>Recommended Actions</div>
                            {profile.actions.map((a, i) => (
                                <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 14 }}>
                                    <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: B.gold, flexShrink: 0, marginTop: 2 }}>{String(i + 1).padStart(2, "0")}</span>
                                    <span style={{ fontSize: 13, color: "#94A3B8", lineHeight: 1.7 }}>{a}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* CTA */}
                    <div style={{ background: B.white, border: `1px solid ${B.lightGrey}`, borderRadius: 10, padding: "28px 24px", textAlign: "center", marginBottom: 20 }}>
                        <p style={{ fontSize: 11, letterSpacing: "0.1em", color: B.gold, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Ready to Improve Your Score?</p>
                        <h3 style={{ fontSize: 20, fontWeight: 700, color: B.navy, marginBottom: 12 }}>Talk to a Bizcom AI Governance Expert</h3>
                        <p style={{ fontSize: 13, color: B.greyDark, marginBottom: 20, lineHeight: 1.6 }}>Our ISO 42001 Lead Implementer certified team can help you design, implement, and maintain your AI governance framework.</p>
                        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                            <a href="https://bizcomgrp.com/contact/" target="_blank" rel="noreferrer"
                                style={{ background: B.gold, color: B.navy, fontWeight: 700, fontSize: 13, padding: "12px 28px", borderRadius: 7, textDecoration: "none", letterSpacing: "0.05em" }}>
                                Contact Us →
                            </a>
                            <button onClick={downloadPDF}
                                style={{ background: B.navy, color: B.white, border: "none", fontSize: 13, padding: "12px 24px", borderRadius: 7, cursor: "pointer", fontWeight: 700 }}>
                                {pdfGenerating ? "Generating..." : "Download PDF Report"}
                            </button>
                            <button onClick={restart}
                                style={{ background: "transparent", border: `1px solid ${B.lightGrey}`, color: B.greyDark, fontSize: 13, padding: "12px 24px", borderRadius: 7, cursor: "pointer" }}>
                                ↺ Retake Assessment
                            </button>
                        </div>
                    </div>
                </div>

                <Footer />
            </div>
        );
    }

    return null;
}

// ─── MOUNT ────────────────────────────────────────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
