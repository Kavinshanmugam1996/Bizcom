const { useState, useEffect, useMemo } = React;

const C = {
    bgCard: "rgba(8, 20, 38, 0.72)",
    border: "#2b4f78",
    text: "#eaf2ff",
    muted: "#9bb5d1",
    accent: "#f2be4a",
    accentDark: "#ad7f1e",
    success: "#2ea778",
    danger: "#d06060",
};

function Card({ children, style = {} }) {
    return React.createElement("div", {
        style: {
            background: C.bgCard,
            border: "1px solid " + C.border,
            borderRadius: 16,
            padding: 22,
            boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
            ...style,
        },
    }, children);
}

function Btn({ children, onClick, disabled = false, ghost = false }) {
    return React.createElement("button", {
        onClick,
        disabled,
        style: {
            border: ghost ? "1px solid " + C.border : "none",
            background: ghost ? "transparent" : disabled ? "#7e8ea3" : C.accent,
            color: ghost ? C.text : "#14253b",
            borderRadius: 8,
            padding: "10px 16px",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.04em",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.75 : 1,
            marginRight: 8,
        },
    }, children);
}

function TextInput({ value, onChange, placeholder, type = "text" }) {
    return React.createElement("input", {
        value,
        onChange: (e) => onChange(e.target.value),
        placeholder,
        type,
        style: {
            width: "100%",
            border: "1px solid " + C.border,
            background: "#10233d",
            color: C.text,
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 13,
            outline: "none",
        },
    });
}

function App() {
    const [screen, setScreen] = useState("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState("");
    const [token, setToken] = useState(() => localStorage.getItem("system2_token") || "");
    const [me, setMe] = useState(null);
    const [useCases, setUseCases] = useState([]);
    const [selected, setSelected] = useState([]);
    const [questions, setQuestions] = useState([]);
    const [current, setCurrent] = useState(0);
    const [answers, setAnswers] = useState({});
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);

    async function authFetch(url, opts = {}) {
        const headers = { ...(opts.headers || {}), Authorization: "Bearer " + token };
        const res = await fetch(url, { ...opts, headers });
        if (res.status === 401) {
            logout();
            throw new Error("Session expired. Please log in again.");
        }
        return res;
    }

    function logout() {
        localStorage.removeItem("system2_token");
        setToken("");
        setMe(null);
        setScreen("login");
        setSelected([]);
        setAnswers({});
        setReport(null);
    }

    async function loadMeAndRouting() {
        const res = await authFetch("/api/system2/me");
        const data = await res.json();
        setMe(data);
        setSelected(data.my_use_cases || []);

        if (data.survey_unlocked) {
            setScreen("ready");
            return;
        }
        if (data.my_selection_done) {
            setScreen("waiting");
            return;
        }
        setScreen("select");
    }

    useEffect(() => {
        if (!token) return;
        setLoading(true);
        Promise.all([
            authFetch("/api/ai-use-cases").then((r) => r.json()),
            loadMeAndRouting(),
        ]).then(([ucData]) => {
            setUseCases(ucData.data || []);
            setLoading(false);
        }).catch((err) => {
            setLoginError(err.message || "Failed to load System 2 data.");
            setLoading(false);
        });
    }, [token]);

    useEffect(() => {
        if (!token || screen !== "waiting") return;
        const id = setInterval(async () => {
            try {
                const res = await authFetch("/api/system2/status");
                const data = await res.json();
                if (data.survey_unlocked) {
                    setScreen("ready");
                    clearInterval(id);
                }
            } catch (_) {
                clearInterval(id);
            }
        }, 5000);
        return () => clearInterval(id);
    }, [token, screen]);

    async function login() {
        if (!email.trim() || !password) {
            setLoginError("Enter both email and password.");
            return;
        }
        setLoading(true);
        setLoginError("");
        try {
            const res = await fetch("/api/system2/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim(), password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Login failed.");
            localStorage.setItem("system2_token", data.access_token);
            setToken(data.access_token);
            setPassword("");
        } catch (err) {
            setLoginError(err.message || "Login failed.");
        } finally {
            setLoading(false);
        }
    }

    function toggleUseCase(uc) {
        if (selected.includes(uc)) {
            setSelected(selected.filter((x) => x !== uc));
            return;
        }
        if (selected.length >= 5) return;
        setSelected([...selected, uc]);
    }

    async function submitUseCases() {
        if (selected.length < 1 || selected.length > 5) {
            alert("Select at least 1 and at most 5 use cases.");
            return;
        }
        if (selected.includes("UC27") && selected.length > 1) {
            alert("UC27 must be selected alone.");
            return;
        }

        setLoading(true);
        try {
            const res = await authFetch("/api/system2/select-use-cases", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ai_use_cases: selected }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Failed to save selections.");
            setScreen(data.survey_unlocked ? "ready" : "waiting");
            await loadMeAndRouting();
        } catch (err) {
            alert(err.message || "Failed to save selections.");
        } finally {
            setLoading(false);
        }
    }

    async function startSurvey() {
        setLoading(true);
        try {
            const res = await authFetch("/api/system2/questions");
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Survey is not available yet.");
            setQuestions(data.data || []);
            setCurrent(0);
            setAnswers({});
            setScreen("survey");
        } catch (err) {
            alert(err.message || "Cannot start survey.");
        } finally {
            setLoading(false);
        }
    }

    async function submitSurvey() {
        const responseItems = Object.entries(answers).map(([qid, item]) => ({
            question_id: qid,
            answer_option: item.Answer_Option,
            option_order: item.Option_Order,
        }));

        if (!responseItems.length) {
            alert("Please answer at least one question.");
            return;
        }

        setLoading(true);
        try {
            const res = await authFetch("/api/system2/generate-report", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ responses: responseItems }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || "Report generation failed.");
            setReport(data);
            setScreen("report");
        } catch (err) {
            alert(err.message || "Failed to submit survey.");
        } finally {
            setLoading(false);
        }
    }

    const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

    return React.createElement("div", { style: { maxWidth: 980, margin: "0 auto", padding: "24px 16px 40px" } },
        React.createElement("h1", { style: { margin: "6px 0 4px", color: C.text } }, "AIRES Intervene: System 2"),
        React.createElement("p", { style: { margin: "0 0 20px", color: C.muted } }, "Two-user coordinated assessment portal"),

        token && React.createElement("div", { style: { marginBottom: 12 } },
            React.createElement(Btn, { onClick: logout, ghost: true }, "Log Out")
        ),

        screen === "login" && React.createElement(Card, { style: { maxWidth: 520 } },
            React.createElement("h2", { style: { marginTop: 0 } }, "User Login"),
            React.createElement("p", { style: { color: C.muted, fontSize: 13 } }, "Use your System 2 primary or secondary credentials."),
            React.createElement("div", { style: { marginBottom: 10 } }, React.createElement(TextInput, { value: email, onChange: setEmail, placeholder: "Email" })),
            React.createElement("div", { style: { marginBottom: 10 } }, React.createElement(TextInput, { value: password, onChange: setPassword, placeholder: "Password", type: "password" })),
            loginError && React.createElement("div", { style: { color: C.danger, fontSize: 12, marginBottom: 10 } }, loginError),
            React.createElement(Btn, { onClick: login, disabled: loading }, loading ? "Signing In..." : "Login")
        ),

        screen === "select" && React.createElement(Card, null,
            React.createElement("h2", { style: { marginTop: 0 } }, "Pick AI Use Cases"),
            me && React.createElement("div", { style: { color: C.muted, marginBottom: 12, fontSize: 13 } },
                "Cohort: " + me.cohort_id + " | Role: " + me.user_role
            ),
            React.createElement("p", { style: { color: C.muted, fontSize: 13 } }, "Choose minimum 1 and maximum 5 use cases. This selection is independent for each user."),
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8, marginBottom: 12 } },
                useCases.map((u) => {
                    const checked = selected.includes(u.id);
                    return React.createElement("label", {
                        key: u.id,
                        style: {
                            border: "1px solid " + (checked ? C.accent : C.border),
                            borderRadius: 8,
                            padding: "8px 10px",
                            cursor: "pointer",
                            background: checked ? "rgba(242,190,74,0.12)" : "rgba(255,255,255,0.02)",
                            fontSize: 12,
                            color: C.text,
                        },
                    },
                        React.createElement("input", {
                            type: "checkbox",
                            checked,
                            onChange: () => toggleUseCase(u.id),
                            style: { marginRight: 8 },
                        }),
                        u.label
                    );
                })
            ),
            React.createElement("div", { style: { color: C.muted, fontSize: 12, marginBottom: 12 } }, "Selected: " + selected.length + " / 5"),
            React.createElement(Btn, { onClick: submitUseCases, disabled: loading }, loading ? "Saving..." : "Submit Selection")
        ),

        screen === "waiting" && React.createElement(Card, null,
            React.createElement("h2", { style: { marginTop: 0 } }, "Waiting For Other User"),
            React.createElement("p", { style: { color: C.muted, fontSize: 13 } }, "Your use-case selection is saved. The survey will unlock once both primary and secondary users submit their choices."),
            React.createElement("p", { style: { color: C.success, fontSize: 13 } }, "Status refreshes every 5 seconds.")
        ),

        screen === "ready" && React.createElement(Card, null,
            React.createElement("h2", { style: { marginTop: 0 } }, "Survey Unlocked"),
            React.createElement("p", { style: { color: C.muted, fontSize: 13 } }, "Both selections are received. You can start the unified survey now."),
            React.createElement(Btn, { onClick: startSurvey, disabled: loading }, loading ? "Loading..." : "Start Unified Survey")
        ),

        screen === "survey" && questions.length > 0 && (() => {
            const q = questions[current];
            const a = answers[q.QID];
            return React.createElement(Card, null,
                React.createElement("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 12 } },
                    React.createElement("div", { style: { color: C.muted, fontSize: 12 } }, "Question " + (current + 1) + " of " + questions.length),
                    React.createElement("div", { style: { color: C.muted, fontSize: 12 } }, "Answered: " + answeredCount)
                ),
                React.createElement("h3", { style: { marginTop: 0, lineHeight: 1.4 } }, q.Question_Text || q.QID),
                React.createElement("div", { style: { display: "grid", gap: 8, marginBottom: 14 } },
                    (q.Answers || []).map((opt) => React.createElement("button", {
                        key: opt.Option_Order,
                        onClick: () => setAnswers({ ...answers, [q.QID]: opt }),
                        style: {
                            textAlign: "left",
                            border: "1px solid " + (a && a.Option_Order === opt.Option_Order ? C.accent : C.border),
                            borderRadius: 8,
                            padding: "10px 12px",
                            background: a && a.Option_Order === opt.Option_Order ? "rgba(242,190,74,0.14)" : "rgba(255,255,255,0.02)",
                            color: C.text,
                            cursor: "pointer",
                            fontSize: 12,
                        },
                    },
                        opt.Option_Order + ". " + opt.Answer_Option
                    ))
                ),
                React.createElement("div", null,
                    React.createElement(Btn, { ghost: true, onClick: () => setCurrent(Math.max(0, current - 1)) }, "Previous"),
                    current < questions.length - 1
                        ? React.createElement(Btn, { onClick: () => setCurrent(current + 1), disabled: !a }, "Next")
                        : React.createElement(Btn, { onClick: submitSurvey, disabled: loading }, loading ? "Submitting..." : "Submit Survey")
                )
            );
        })(),

        screen === "report" && report && React.createElement(Card, null,
            React.createElement("h2", { style: { marginTop: 0 } }, "Report Summary"),
            React.createElement("p", null, "Governance Score: " + report.governance_score),
            React.createElement("p", null, "Risk Exposure: " + report.risk_exposure_pct + "%"),
            React.createElement("p", null, "Answered Questions: " + report.total_questions_answered),
            React.createElement("p", null, "Total Trigger Points: " + report.total_trigger_points),
            React.createElement(Btn, { onClick: () => setScreen("ready") }, "Back To Survey Entry")
        )
    );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(React.createElement(App));
