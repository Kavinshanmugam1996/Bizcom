let questions = [];
let currentIndex = 0;
let userResponses = [];

// 1. Fetch questions from your local Python server
async function fetchQuestions() {
    try {
        const response = await fetch('http://127.0.0.1:8000/api/questions');
        const result = await response.json();
        questions = result.data;
        renderQuestion();
    } catch (error) {
        document.getElementById('question-text').innerText = "Error loading questions. Is the server running?";
    }
}

// 2. Display the current question
function renderQuestion() {
    if (currentIndex < questions.length) {
        const q = questions[currentIndex];
        document.getElementById('question-text').innerText = q.Question_Text;
        document.getElementById('domain-text').innerText = q.Domain;

        const progress = (currentIndex / questions.length) * 100;
        document.getElementById('progress-bar').style.width = progress + "%";
    } else {
        showResults();
    }
}

// 3. Save the answer and move to next
function recordAnswer(val) {
    userResponses.push({
        question_id: questions[currentIndex].Question_ID,
        weight: questions[currentIndex].Weight,
        answer: val
    });
    currentIndex++;
    renderQuestion();
}

// 4. Send answers back to Python for final score and report
async function showResults() {
    document.getElementById('quiz-ui').style.display = 'none';
    document.getElementById('result-ui').style.display = 'block';

    const response = await fetch('http://127.0.0.1:8000/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userResponses)
    });

    const report = await response.json();

    // Build HTML for findings
    let riskHtml = '';
    if (report.detailed_risks.length > 0) {
        riskHtml += '<h3>Key Findings</h3><ul style="text-align:left; font-size: 0.9rem;">';
        report.detailed_risks.forEach(risk => {
            riskHtml += `<li style="margin-bottom: 0.5rem;">
                <strong>${risk.domain}</strong>: ${risk.finding}<br>
                <em style="color: #64748b;">Impact: ${risk.impact}</em>
            </li>`;
        });
        riskHtml += '</ul>';
    } else {
        riskHtml += '<p>No significant risks identified.</p>';
    }

    // Build HTML for recommendations
    let recHtml = '';
    if (report.recommendations.length > 0) {
        recHtml += '<h3>Recommendations</h3><ul style="text-align:left; font-size: 0.9rem;">';
        // Deduplicate recommendations if simple text
        const uniqueRecs = [...new Set(report.recommendations.map(r => r.text))];
        uniqueRecs.forEach(rec => {
            recHtml += `<li>${rec}</li>`;
        });
        recHtml += '</ul>';
    }


    const reportContent = document.getElementById('report-content');
    reportContent.innerHTML = `
        <h1 style="font-size: 3rem; color: var(--primary); margin: 0;">${report.score}%</h1>
        <p style="font-size: 1.25rem; margin-top: 0;">Risk Level: <strong>${report.label}</strong></p>
        
        <div style="text-align: center; margin-bottom: 2rem;">
            <button onclick="downloadPDF()" style="background: #ef4444; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: bold; cursor: pointer;">
                Download PDF Report
            </button>
        </div>

        <div style="background: #f1f5f9; padding: 1rem; border-radius: 8px; margin: 1rem 0; text-align: left;">
            <strong>Executive Summary:</strong>
            <p style="margin: 0.5rem 0 0 0;">${report.summary}</p>
        </div>
        
        ${riskHtml}
        ${recHtml}
    `;
}

async function downloadPDF() {
    const btn = document.querySelector('button[onclick="downloadPDF()"]');
    btn.innerText = "Generating PDF...";
    btn.disabled = true;

    try {
        const response = await fetch('http://127.0.0.1:8000/api/download-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userResponses)
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "AI_Risk_Report.pdf";
            document.body.appendChild(a);
            a.click();
            a.remove();
            btn.innerText = "Download PDF Report";
            btn.disabled = false;
        } else {
            alert("Failed to generate PDF.");
            btn.innerText = "Download PDF Report";
            btn.disabled = false;
        }
    } catch (e) {
        console.error(e);
        alert("Error generating PDF.");
        btn.innerText = "Download PDF Report";
        btn.disabled = false;
    }
}

// Start the app
fetchQuestions();