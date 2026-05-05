const { useState, useEffect, useCallback } = React;
const { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } = Recharts;
const B = { navy:"#0B1D33", navyMid:"#112540", navyLight:"#1A3355", gold:"#C49B2C", goldLight:"#D4A843", goldDim:"#8B6D1E", white:"#FFFFFF", offWhite:"#F4F6F9", lightGrey:"#E8EDF3", grey:"#8A9BB0", greyDark:"#4A5E72", greyDeep:"#2A3D52", logoUrl:"https://bizcomgrp.com/wp-content/uploads/2023/09/bizcom_bizcom.png" };
const CLUSTER_ICONS = {"Cluster 1":"🧠","Cluster 2":"🔒","Cluster 3":"⚖️","Cluster 4":"📋","Cluster 5":"⚙️","Cluster 6":"👥","Cluster 7":"📊"};
function getClusterIcon(name){for(let k in CLUSTER_ICONS)if(name&&name.includes(k))return CLUSTER_ICONS[k];return"📌";}
const TIER_COLORS={"Oversight Leader":"#38A169","Governance Mature":"#3182CE","Developing Controls":"#D69E2E","Early Stage":"#DD6B20","Critical Exposure":"#E53E3E"};
function getTierInfo(s){if(s>=80)return{tier:"Oversight Leader",riskLevel:"LOW RISK",color:"#38A169",tagline:"Exemplary AI governance maturity",description:"Your organisation demonstrates exceptional AI oversight with robust controls and mature risk culture.",findings:["Comprehensive governance frameworks embedded","AI risks systematically identified and mitigated","Human oversight mechanisms operational","Ethical principles operationalised"]};if(s>=60)return{tier:"Governance Mature",riskLevel:"LOW-MEDIUM RISK",color:"#3182CE",tagline:"Strong foundations with targeted gaps",description:"Solid AI governance structures in place. Most controls operational with focused gaps remaining.",findings:["Core governance policies documented","Risk assessments conducted broadly","Human-in-the-loop controls exist","Ethics principles documented"]};if(s>=40)return{tier:"Developing Controls",riskLevel:"MEDIUM RISK",color:"#D69E2E",tagline:"Foundational work in progress",description:"AI oversight recognised but implementation inconsistent. Key controls missing or unevenly applied.",findings:["Governance policies not consistently enforced","Risk assessments reactive not proactive","Monitoring largely ad hoc","Ethics not systematically applied"]};if(s>=20)return{tier:"Early Stage",riskLevel:"HIGH RISK",color:"#DD6B20",tagline:"Significant gaps requiring urgent attention",description:"AI oversight posture presents material risk. Governance largely informal and controls insufficient.",findings:["No comprehensive AI governance framework","Risks not systematically managed","Systems may lack human oversight","Compliance cannot be demonstrated"]};return{tier:"Critical Exposure",riskLevel:"CRITICAL RISK",color:"#E53E3E",tagline:"Immediate executive intervention required",description:"AI oversight represents critical risk with absence of governance creating severe exposure.",findings:["No governance structure exists","Systems deployed without assessment","No human oversight mechanisms","Compliance entirely unaddressed"]};}
function BizcomLogo({style={}}){return React.createElement("img",{src:B.logoUrl,alt:"Bizcom",style:{height:44,objectFit:"contain",...style},onError:e=>{e.target.style.display="none"}});}
function NavBar({showContact=true,onLogout=null}){return React.createElement("div",{style:{background:B.navy,borderBottom:"1px solid "+B.navyLight,padding:"0 32px",display:"flex",alignItems:"center",justifyContent:"space-between",height:68,position:"sticky",top:0,zIndex:100}},React.createElement(BizcomLogo),React.createElement("div",{style:{display:"flex",alignItems:"center",gap:10}},showContact&&React.createElement("a",{href:"https://bizcomgrp.com/contact/",target:"_blank",rel:"noreferrer",style:{background:B.gold,color:B.navy,fontSize:12,fontWeight:700,letterSpacing:"0.06em",padding:"9px 20px",borderRadius:6,textDecoration:"none"}},"Contact Us"),onLogout&&React.createElement("button",{onClick:onLogout,style:{background:"transparent",color:B.white,border:"1px solid "+B.greyDark,borderRadius:6,padding:"8px 14px",fontSize:11,fontWeight:700,cursor:"pointer",letterSpacing:"0.05em"}},"Log Out")));}
function Footer(){return React.createElement("div",{style:{background:B.navy,borderTop:"1px solid "+B.navyLight,padding:"28px 32px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}},React.createElement(BizcomLogo,{style:{height:36}}),React.createElement("p",{style:{fontSize:11,color:B.greyDark,margin:0}},"© 2026 Bizcom – Building AI Governance Frameworks for Tomorrow."),React.createElement("a",{href:"https://bizcomgrp.com",target:"_blank",rel:"noreferrer",style:{fontSize:11,color:B.gold,textDecoration:"none"}},"bizcomgrp.com →"));}
function GoldBtn({onClick,disabled,children,outline=false}){return React.createElement("button",{onClick,disabled,style:{background:outline?"transparent":disabled?B.lightGrey:B.gold,color:outline?B.greyDark:disabled?B.grey:B.navy,border:outline?"1px solid "+B.lightGrey:"none",borderRadius:8,padding:"12px 28px",fontSize:13,fontWeight:700,letterSpacing:"0.05em",cursor:disabled?"not-allowed":"pointer",transition:"all 0.2s",boxShadow:!outline&&!disabled?"0 4px 16px "+B.gold+"44":"none"}},children);}
function FieldRow({label,children}){return React.createElement("div",{style:{marginBottom:18}},React.createElement("label",{style:{display:"block",fontSize:11,fontWeight:700,color:B.greyDark,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:6}},label),children);}
function Input({value,onChange,placeholder,type="text"}){return React.createElement("input",{type,value,onChange:e=>onChange(e.target.value),placeholder,style:{width:"100%",padding:"10px 14px",border:"1.5px solid "+B.lightGrey,borderRadius:8,fontSize:13,color:B.navy,background:B.white,outline:"none",boxSizing:"border-box"}});}
function Select({value,onChange,options}){return React.createElement("select",{value,onChange:e=>onChange(e.target.value),style:{width:"100%",padding:"10px 14px",border:"1.5px solid "+B.lightGrey,borderRadius:8,fontSize:13,color:B.navy,background:B.white,outline:"none",boxSizing:"border-box",cursor:"pointer"}},React.createElement("option",{value:""},"— Select —"),options.map(o=>React.createElement("option",{key:o,value:o},o)));}
function UseCaseSelect({value,onChange,options}){return React.createElement("select",{value,onChange:e=>onChange(e.target.value),style:{width:"100%",padding:"10px 14px",border:"1.5px solid "+B.lightGrey,borderRadius:8,fontSize:13,color:B.navy,background:B.white,outline:"none",boxSizing:"border-box",cursor:"pointer"}},React.createElement("option",{value:""},"Select type..."),options.map(o=>React.createElement("option",{key:o.id,value:o.id},o.label)));}

function makeAiUsageItem(){
    return { description: "", useCase: "" };
}
function RationaleModal({ qid, onClose, authFetch }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        authFetch("/api/rationale/" + qid).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
    }, [qid, authFetch]);
    return React.createElement("div", { style: { position: "fixed", inset: 0, background: "rgba(11,29,51,0.85)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 } },
        React.createElement("div", { style: { background: "white", borderRadius: 16, width: "100%", maxWidth: 600, maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" } },
            React.createElement("div", { style: { padding: "20px 24px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", background: B.navy } },
                React.createElement("h3", { style: { margin: 0, color: B.gold, fontSize: 16 } }, "Question Rationale: " + qid),
                React.createElement("button", { onClick: onClose, style: { background: "none", border: "none", color: "white", cursor: "pointer", fontSize: 20 } }, "×")
            ),
            React.createElement("div", { style: { padding: "24px", overflowY: "auto", flex: 1 } },
                loading ? React.createElement("p", null, "Loading...") : React.createElement("div", null,
                    React.createElement("p", { style: { fontWeight: 700, color: B.navy, marginBottom: 12, fontSize: 14 } }, data.Question_Text),
                    React.createElement("div", { style: { whiteSpace: "pre-wrap", color: B.greyDeep, fontSize: 13, lineHeight: 1.6, background: B.offWhite, padding: 16, borderRadius: 8, borderLeft: "4px solid " + B.gold } }, data.Rationale || "No rationale provided.")
                )
            ),
            React.createElement("div", { style: { padding: "16px 24px", borderTop: "1px solid #eee", textAlign: "right" } },
                React.createElement(GoldBtn, { onClick: onClose }, "Close")
            )
        )
    );
}

function App() {
    const MAX_AI_USAGES = 5;
    const [phase, setPhase] = useState(() => localStorage.getItem("bizcom_token") ? "intro" : "login");
    const [authToken, setAuthToken] = useState(() => localStorage.getItem("bizcom_token") || "");
    const [loginEmail, setLoginEmail] = useState("");
    const [loginPassword, setLoginPassword] = useState("");
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState("");
    const [company, setCompany] = useState({ 
        company_name: "", 
        industry: "All Industries", 
        company_size: "", 
        regulatory_region: "All Jurisdictions", 
        ai_use_cases: [],
        ai_maturity_level: "", 
        assessor_name: "", 
        assessor_email: "", 
        assessor_role: "" 
    });
    const [aiInventory, setAiInventory] = useState([makeAiUsageItem(), makeAiUsageItem(), makeAiUsageItem()]);
    const [clusterMap, setClusterMap] = useState({}); // { "Cluster 1": [qs], ... }
    const [questions, setQuestions] = useState([]); // Questions for selected cluster
    const [selectedCluster, setSelectedCluster] = useState(null);
    const [current, setCurrent] = useState(0);
    const [answers, setAnswers] = useState({});
    const [showRationale, setShowRationale] = useState(null);
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [useCases, setUseCases] = useState([]);

    const authFetch = useCallback(async (url, options = {}) => {
        const headers = { ...(options.headers || {}) };
        if (authToken) headers.Authorization = "Bearer " + authToken;
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401) {
            localStorage.removeItem("bizcom_token");
            setAuthToken("");
            setPhase("login");
            throw new Error("Your session expired. Please log in again.");
        }
        return response;
    }, [authToken]);

    async function handleLogin() {
        if (!loginEmail.trim() || !loginPassword) {
            setLoginError("Enter both email and password.");
            return;
        }
        setLoginLoading(true);
        setLoginError("");
        try {
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword })
            });
            const payload = await res.json();
            if (!res.ok) throw new Error(payload?.detail || "Login failed.");
            localStorage.setItem("bizcom_token", payload.access_token);
            setAuthToken(payload.access_token);
            setLoginPassword("");
            setPhase("intro");
        } catch (err) {
            setLoginError(err?.message || "Login failed.");
        } finally {
            setLoginLoading(false);
        }
    }

    function logout() {
        localStorage.removeItem("bizcom_token");
        setAuthToken("");
        setLoginPassword("");
        setPhase("login");
    }

    useEffect(() => {
        if (!authToken) return;
        authFetch("/api/ai-use-cases")
            .then(r => r.json())
            .then(d => {
                setUseCases(d.data || []);
            })
            .catch(() => setUseCases([]));
    }, [authToken, authFetch]);

    async function startAssessment() {
        const normalized = aiInventory.map(i => ({
            description: (i.description || "").trim(),
            useCase: i.useCase || ""
        }));

        if (!normalized[0]?.description || !normalized[0]?.useCase) {
            alert("Please complete AI Usage Description 1 and select a mapped use case.");
            return;
        }

        const partiallyFilled = normalized.some(i => (i.description && !i.useCase) || (!i.description && i.useCase));
        if (partiallyFilled) {
            alert("Each AI usage entry must include both description and mapped use case.");
            return;
        }

        const completedEntries = normalized.filter(i => i.description && i.useCase);
        const selectedUseCases = Array.from(new Set(completedEntries.map(i => i.useCase)));

        if (selectedUseCases.length < 1 || selectedUseCases.length > 5) {
            alert("Please select between 1 and 5 mapped AI use cases.");
            return;
        }

        if (selectedUseCases.includes("UC27") && selectedUseCases.length > 1) {
            alert("UC27 (No AI) must be selected alone.");
            return;
        }

        setLoading(true);
        let filtered = [];
        try {
            const res = await authFetch("/api/questionnaire/build", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ai_use_cases: selectedUseCases })
            });
            const payload = await res.json();
            if (!res.ok) {
                throw new Error(payload?.detail || "Failed to build questionnaire.");
            }
            filtered = payload.data || [];
        } catch (err) {
            setLoading(false);
            alert(err?.message || "Failed to build questionnaire from mapper.");
            return;
        }
        
        if (filtered.length === 0) {
            setLoading(false);
            alert("No questions found for the selected criteria.");
            return;
        }

        // Group by cluster
        const map = {};
        filtered.forEach(q => {
            const c = q.Cluster_Group || "Uncategorized";
            if (!map[c]) map[c] = [];
            map[c].push(q);
        });
        
        setClusterMap(map);
        setCompany({ ...company, ai_use_cases: selectedUseCases });
        setAnswers({});
        setLoading(false);
        goTo("clusters");
    }

    function updateInventoryItem(index, patch) {
        const next = aiInventory.slice();
        next[index] = { ...next[index], ...patch };
        setAiInventory(next);
    }

    function addInventoryItem() {
        if (aiInventory.length >= MAX_AI_USAGES) return;
        setAiInventory([...aiInventory, makeAiUsageItem()]);
    }

    function selectCluster(c) {
        setSelectedCluster(c);
        setQuestions(clusterMap[c]);
        setCurrent(0);
        goTo("quiz");
    }

    function submitAssessment() {
        setLoading(true);
        authFetch("/api/generate-report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                company, 
                responses: Object.entries(answers).map(([qid, a]) => ({ 
                    question_id: qid, 
                    answer_option: a.Answer_Option, 
                    option_order: a.Option_Order 
                })) 
            })
        }).then(r => r.json()).then(d => {
            setReportData(d);
            goTo("result");
            setLoading(false);
        }).catch(err => {
            setLoading(false);
            alert(err?.message || "Failed to submit assessment.");
        });
    }

    function goTo(p) { setPhase(p); window.scrollTo(0, 0); }

    if (phase === "login") return React.createElement("div", { style: { minHeight: "100vh", background: B.offWhite } },
        React.createElement(NavBar, { showContact: false }),
        React.createElement("div", { style: { maxWidth: 460, margin: "70px auto", background: "white", padding: 30, borderRadius: 16, boxShadow: "0 8px 30px rgba(0,0,0,0.08)" } },
            React.createElement("h2", { style: { margin: "0 0 8px", color: B.navy } }, "Intervene System Login"),
            React.createElement("p", { style: { margin: "0 0 22px", color: B.greyDeep, fontSize: 13 } }, "Sign in to access the AI use-case assessment form."),
            React.createElement(FieldRow, { label: "Email" }, React.createElement(Input, { value: loginEmail, onChange: setLoginEmail, placeholder: "name@company.com", type: "email" })),
            React.createElement(FieldRow, { label: "Password" }, React.createElement(Input, { value: loginPassword, onChange: setLoginPassword, placeholder: "Enter password", type: "password" })),
            loginError && React.createElement("div", { style: { marginBottom: 12, color: "#B91C1C", fontSize: 12, fontWeight: 700 } }, loginError),
            React.createElement("div", { style: { display: "flex", justifyContent: "flex-end" } },
                React.createElement(GoldBtn, { onClick: handleLogin, disabled: loginLoading }, loginLoading ? "Signing In..." : "Login")
            )
        ),
        React.createElement(Footer)
    );

    if (phase === "intro") return React.createElement("div", { style: { minHeight: "100vh", background: B.offWhite } },
        React.createElement(NavBar, { onLogout: logout }),
        React.createElement("div", { style: { background: B.navy, padding: "80px 24px", textAlign: "center" } },
            React.createElement("h1", { style: { color: "white", fontSize: 48, margin: 0 } }, "AI Risk Assessment"),
            React.createElement("h1", { style: { color: B.gold, fontSize: 48, margin: "0 0 24px" } }, "Powered by Bizcom"),
            React.createElement("p", { style: { color: "#94A3B8", maxWidth: 600, margin: "0 auto 32px", fontSize: 18 } }, "Comprehensive QID-centric auditing for AI systems. Grouped by clusters, focused on compliance."),
            React.createElement(GoldBtn, { onClick: () => goTo("profile") }, "Begin Assessment →")
        ),
        React.createElement(Footer)
    );

    if (phase === "profile") return React.createElement("div", { style: { minHeight: "100vh", background: B.offWhite } },
        React.createElement(NavBar, { onLogout: logout }),
        React.createElement("div", { style: { maxWidth: 760, margin: "40px auto", background: "white", padding: 28, borderRadius: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.05)" } },
            React.createElement("div", { style: { marginBottom: 16, borderLeft: "3px solid #1F6FE5", paddingLeft: 10 } },
                React.createElement("h2", { style: { color: B.navy, margin: 0, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase" } }, "AI Inventory"),
                React.createElement("p", { style: { margin: "6px 0 0", color: B.greyDark, fontSize: 12 } }, "Describe how your organisation uses AI. The system maps each entry to the selected use case.")
            ),
            aiInventory.map((item, idx) => React.createElement("div", { key: idx, style: { border: "1px solid #D8E0EA", borderRadius: 8, padding: 14, marginBottom: 10 } },
                React.createElement("div", { style: { color: "#1F6FE5", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8 } }, `AI Usage Description ${idx + 1}${idx === 0 ? " *" : " (optional)"}`),
                React.createElement("div", { style: { color: B.navy, fontSize: 11, fontWeight: 700, marginBottom: 4 } }, "What does this AI do?"),
                React.createElement(Input, { value: item.description, onChange: v => updateInventoryItem(idx, { description: v }), placeholder: "e.g. We use a chatbot for customer support..." }),
                React.createElement("div", { style: { color: B.navy, fontSize: 11, fontWeight: 700, margin: "10px 0 4px" } }, "Mapped Use Case"),
                React.createElement(UseCaseSelect, { value: item.useCase, options: useCases, onChange: v => updateInventoryItem(idx, { useCase: v }) })
            )),
            React.createElement("button", { onClick: addInventoryItem, disabled: aiInventory.length >= MAX_AI_USAGES, style: { width: "100%", marginTop: 2, border: "1.5px dashed #2B8DF2", borderRadius: 8, background: "#F8FCFF", color: "#1F6FE5", fontSize: 12, fontWeight: 700, padding: "10px 12px", cursor: aiInventory.length >= MAX_AI_USAGES ? "not-allowed" : "pointer", opacity: aiInventory.length >= MAX_AI_USAGES ? 0.6 : 1 } }, aiInventory.length >= MAX_AI_USAGES ? "Max 5 AI usages added" : "+ Add Another AI Usage"),
            React.createElement("div", { style: { marginTop: 8, color: B.greyDark, fontSize: 11 } }, `Use-case limit: minimum 1, maximum ${MAX_AI_USAGES}.`),
            React.createElement("div", { style: { height: 20 } }),
            React.createElement(FieldRow, { label: "Assessor Name" }, React.createElement(Input, { value: company.assessor_name, onChange: v => setCompany({ ...company, assessor_name: v }) })),
            React.createElement(FieldRow, { label: "Assessor Email" }, React.createElement(Input, { value: company.assessor_email, onChange: v => setCompany({ ...company, assessor_email: v }) })),
            React.createElement("div", { style: { marginTop: 32, display: "flex", justifyContent: "space-between" } },
                React.createElement(GoldBtn, { outline: true, onClick: () => goTo("intro") }, "Back"),
                React.createElement(GoldBtn, { onClick: startAssessment, disabled: loading }, loading ? "Loading..." : "Proceed to Clusters")
            )
        ),
        React.createElement(Footer)
    );

    if (phase === "clusters") {
        const clusterNames = Object.keys(clusterMap).sort();
        const totalQs = Object.values(clusterMap).reduce((acc, qs) => acc + qs.length, 0);
        const answeredQs = Object.keys(answers).length;
        const allDone = answeredQs === totalQs && totalQs > 0;

        return React.createElement("div", { style: { minHeight: "100vh", background: B.offWhite } },
            React.createElement(NavBar, { onLogout: logout }),
            React.createElement("div", { style: { maxWidth: 900, margin: "40px auto", padding: "0 20px" } },
                React.createElement("div", { style: { marginBottom: 32 } },
                    React.createElement("h2", { style: { color: B.navy, margin: 0 } }, "Assessment Modules"),
                    React.createElement("p", { style: { color: B.grey, marginTop: 8 } }, `Overall Progress: ${answeredQs} of ${totalQs} questions answered`),
                    React.createElement("div", { style: { height: 6, background: "#e2e8f0", borderRadius: 3, marginTop: 12, overflow: "hidden" } },
                        React.createElement("div", { style: { height: "100%", width: (answeredQs / totalQs * 100) + "%", background: B.gold, transition: "width 0.5s ease" } })
                    )
                ),
                React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 } },
                    clusterNames.map(c => {
                        const qs = clusterMap[c];
                        const doneCount = qs.filter(q => answers[q.QID]).length;
                        const isDone = doneCount === qs.length;
                        return React.createElement("div", { key: c, onClick: () => selectCluster(c), style: { background: "white", padding: 24, borderRadius: 16, boxShadow: "0 4px 12px rgba(0,0,0,0.05)", cursor: "pointer", border: "2px solid " + (isDone ? B.gold : "transparent"), transition: "transform 0.2s" } },
                            React.createElement("h3", { style: { color: B.navy, margin: "0 0 8px", fontSize: 16 } }, c),
                            React.createElement("div", { style: { fontSize: 12, color: B.greyDeep, fontWeight: 700 } }, `${doneCount} / ${qs.length} Questions`),
                            React.createElement("div", { style: { height: 4, background: "#f1f5f9", borderRadius: 2, marginTop: 12, overflow: "hidden" } },
                                React.createElement("div", { style: { height: "100%", width: (doneCount / qs.length * 100) + "%", background: isDone ? B.gold : B.navyLight, transition: "width 0.3s" } })
                            )
                        );
                    })
                ),
                React.createElement("div", { style: { marginTop: 40, textAlign: "center" } },
                    React.createElement(GoldBtn, { onClick: submitAssessment, disabled: !allDone || loading }, loading ? "Processing..." : allDone ? "Submit Full Assessment" : "Complete all clusters to submit")
                )
            ),
            React.createElement(Footer)
        );
    }

    if (phase === "quiz") {
        const q = questions[current];
        if (!q) return React.createElement("div", null, "Loading...");
        const progress = ((current + 1) / questions.length) * 100;

        return React.createElement("div", { style: { minHeight: "100vh", background: B.offWhite } },
            React.createElement(NavBar, { onLogout: logout }),
            React.createElement("div", { style: { height: 4, background: "#eee" } }, React.createElement("div", { style: { height: "100%", width: progress + "%", background: B.gold, transition: "width 0.3s" } })),
            React.createElement("div", { style: { maxWidth: 1000, margin: "40px auto", padding: "0 24px" } },
                // Hero Section (Metadata Tags)
                React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, gap: 20 } },
                    React.createElement("div", { style: { flex: 1 } },
                        React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 } },
                            React.createElement("span", { style: { background: B.navy, color: B.gold, padding: "6px 12px", borderRadius: 4, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" } }, q.Risk_Category),
                            React.createElement("span", { style: { background: "#E2E8F0", color: B.greyDeep, padding: "6px 12px", borderRadius: 4, fontSize: 10, fontWeight: 700 } }, "Question Group: " + q.Question_Group)
                        )
                    ),
                    React.createElement("div", { style: { textAlign: "right", minWidth: 100 } },
                        React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: B.navy } }, `Question ${current + 1} of ${questions.length}`),
                        React.createElement("button", { onClick: () => goTo("clusters"), style: { background: "none", border: "none", color: B.gold, fontSize: 11, fontWeight: 700, cursor: "pointer", textDecoration: "underline", padding: "4px 0" } }, "Save & Exit to Modules")
                    )
                ),
                // Main Question Card
                React.createElement("div", { style: { background: "white", padding: "48px 60px", borderRadius: 16, boxShadow: "0 10px 30px rgba(0,0,0,0.04)", position: "relative" } },
                    React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 32, alignItems: "center" } },
                        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } },
                            current > 0 && React.createElement("button", { onClick: () => setCurrent(current - 1), style: { background: "none", border: "none", color: B.gold, cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, padding: 0 } }, "← Back"),
                            React.createElement("span", { style: { color: B.grey, fontSize: 13, fontWeight: 700, letterSpacing: "0.02em" } }, selectedCluster)
                        ),
                        React.createElement("button", { onClick: () => setShowRationale(q.QID), style: { background: "none", border: "none", color: B.gold, cursor: "pointer", fontSize: 11, fontWeight: 700, textDecoration: "underline", padding: 0 } }, "Click here to know more about the questions")
                    ),
                    React.createElement("h2", { style: { color: B.navy, lineHeight: 1.4, margin: "0 0 40px", fontSize: 28, fontWeight: 800 } }, q.Question_Text),
                    React.createElement("div", { style: { display: "grid", gap: 16 } },
                        q.Answers.map(a => React.createElement("button", { key: a.Option_Order, onClick: () => setAnswers({ ...answers, [q.QID]: a }), style: { padding: "24px 32px", textAlign: "left", borderRadius: 12, border: "2px solid " + (answers[q.QID]?.Option_Order === a.Option_Order ? B.gold : "#F1F5F9"), background: answers[q.QID]?.Option_Order === a.Option_Order ? B.offWhite : "white", cursor: "pointer", transition: "all 0.2s", fontSize: 15, fontWeight: 500, color: B.navy } },
                            React.createElement("span", { style: { fontWeight: 800, marginRight: 16, color: answers[q.QID]?.Option_Order === a.Option_Order ? B.gold : B.grey } }, a.Option_Order + "."),
                            a.Answer_Option
                        ))
                    )
                ),
                // Footer Navigation
                React.createElement("div", { style: { marginTop: 40, display: "flex", justifyContent: "space-between", alignItems: "center" } },
                    React.createElement(GoldBtn, { outline: true, onClick: () => current > 0 ? setCurrent(current - 1) : goTo("clusters") }, current > 0 ? "← Previous Question" : "Exit to Modules"),
                    React.createElement(GoldBtn, { onClick: () => {
                        if (current < questions.length - 1) { setCurrent(current + 1); }
                        else { goTo("clusters"); }
                    }, disabled: !answers[q.QID] }, current < questions.length - 1 ? "Next Question →" : "Finish Cluster & Return")
                )
            ),
            showRationale && React.createElement(RationaleModal, { qid: showRationale, onClose: () => setShowRationale(null), authFetch }),
            React.createElement(Footer)
        );
    }
    if (phase === "result") {
        const tier = getTierInfo(reportData.governance_score);
        return React.createElement("div", { style: { minHeight: "100vh", background: B.offWhite } },
            React.createElement(NavBar, { onLogout: logout }),
            React.createElement("div", { style: { background: B.navy, padding: "60px 24px", textAlign: "center", borderBottom: "4px solid " + tier.color } },
                React.createElement("div", { style: { fontSize: 80, fontWeight: 900, color: tier.color, marginBottom: 8 } }, Math.round(reportData.governance_score)),
                React.createElement("h2", { style: { color: "white", margin: 0 } }, tier.tier),
                React.createElement("p", { style: { color: B.grey, marginTop: 8 } }, tier.tagline)
            ),
            React.createElement("div", { style: { maxWidth: 900, margin: "40px auto", padding: "0 20px" } },
                React.createElement("div", { style: { background: "white", padding: 32, borderRadius: 16, marginBottom: 24 } },
                    React.createElement("h3", { style: { color: B.navy, borderBottom: "2px solid " + B.gold, paddingBottom: 12, marginBottom: 20 } }, "Assessment Summary"),
                    React.createElement("p", { style: { color: B.greyDeep, lineHeight: 1.6 } }, tier.description),
                    React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginTop: 32 } },
                        React.createElement("div", { style: { textAlign: "center", padding: 20, background: B.offWhite, borderRadius: 12 } },
                            React.createElement("div", { style: { fontSize: 24, fontWeight: 700, color: B.navy } }, reportData.total_questions_answered),
                            React.createElement("div", { style: { fontSize: 11, color: B.grey, textTransform: "uppercase" } }, "Questions")
                        ),
                        React.createElement("div", { style: { textAlign: "center", padding: 20, background: B.offWhite, borderRadius: 12 } },
                            React.createElement("div", { style: { fontSize: 24, fontWeight: 700, color: "#E53E3E" } }, reportData.total_trigger_points),
                            React.createElement("div", { style: { fontSize: 11, color: B.grey, textTransform: "uppercase" } }, "Risk Gaps")
                        )
                    )
                ),
                React.createElement("div", { style: { background: "white", padding: 32, borderRadius: 16 } },
                    React.createElement("h3", { style: { color: B.navy, marginBottom: 24 } }, "Cluster Breakdown"),
                    Object.entries(reportData.cluster_breakdown).map(([c, d]) => React.createElement("div", { key: c, style: { marginBottom: 16 } },
                        React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 8 } },
                            React.createElement("span", { style: { fontSize: 13, fontWeight: 700 } }, c),
                            React.createElement("span", { style: { fontSize: 13, color: B.gold, fontWeight: 700 } }, Math.round(d.governance_score) + "%")
                        ),
                        React.createElement("div", { style: { height: 8, background: "#eee", borderRadius: 4 } },
                            React.createElement("div", { style: { height: "100%", width: d.governance_score + "%", background: B.gold, borderRadius: 4 } })
                        )
                    ))
                ),
                React.createElement("div", { style: { marginTop: 40, textAlign: "center" } },
                    React.createElement(GoldBtn, { onClick: () => window.location.reload() }, "Restart Assessment")
                )
            ),
            React.createElement(Footer)
        );
    }

    return null;
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(App));
