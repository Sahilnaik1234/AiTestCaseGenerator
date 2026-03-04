/* --- Demo data embedded so dashboard works offline --- */
const DEMO_REPORT = {
    coverage_percentage: 45.95,
    files_below_threshold: [
        { file: "UserService.java", coverage: 28.57, missed_lines: 5 },
        { file: "AuthService.java", coverage: 25.00, missed_lines: 15 }
    ],
    uncovered_hotspots: [
        "UserService.java: validateUserInput (High Risk Logic)",
        "AuthService.java: login (High Risk Logic)"
    ],
    security_summary: { critical: 0, high: 1, medium: 1, low: 0 },
    suggested_test_cases: [
        {
            file: "UserService.java",
            uncovered_function: "validateUserInput",
            suggested_tests: [
                "Test null or empty input",
                "Test invalid format/characters",
                "Test boundary/limit conditions (max/min length)",
                "Test successful validation with valid input"
            ]
        },
        {
            file: "AuthService.java",
            uncovered_function: "login",
            suggested_tests: [
                "Test incorrect credentials",
                "Test expired or malformed token",
                "Test account lockout after multiple attempts",
                "Test successful authentication"
            ]
        }
    ],
    risk_score: 59.57,
    recommendations: [
        "Overall coverage is 45.95%, which is below the 70% threshold.",
        "Prioritize increasing coverage in: UserService.java, AuthService.java",
        "Immediate attention required for High/Critical security vulnerabilities.",
        "Fix the 2 identified security hotspots."
    ],
    metrics: { coverage_risk: 54.05, security_risk: 20 }
};

/* ─── Entry points ─── */
function loadDemo() {
    applyReport(DEMO_REPORT);
}

function loadReport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            applyReport(data);
        } catch {
            alert("Invalid JSON file. Please load a valid quality-report.json");
        }
    };
    reader.readAsText(file);
}

/* ─── Apply report data to DOM ─── */
function applyReport(report) {
    document.getElementById('landing').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');

    renderHealth(report.risk_score);
    renderHeroStats(report);
    renderSecurity(report.security_summary);
    renderCoverageMetrics(report);
    renderFiles(report.files_below_threshold || []);
    renderHotspots(report.uncovered_hotspots || []);
    renderTestCases(report.suggested_test_cases || []);
    renderRecommendations(report.recommendations || []);
}

/* ─── Health ring animation ─── */
function renderHealth(score) {
    const pct = Math.min(100, Math.max(0, score));
    const circumference = 2 * Math.PI * 80; // r=80 → ~502.65
    const offset = circumference - (pct / 100) * circumference;

    const el = document.getElementById('healthScore');
    const arc = document.getElementById('healthArc');

    arc.style.strokeDashoffset = offset;
    // colour: green ≥70, yellow ≥50, red <50
    arc.style.stroke =
        pct >= 70 ? 'url(#arcGrad)' :
            pct >= 50 ? '#f59e0b' : '#ef4444';

    // Counting animation
    let current = 0;
    const step = pct / 60;
    const timer = setInterval(() => {
        current = Math.min(current + step, pct);
        el.textContent = Math.round(current);
        if (current >= pct) clearInterval(timer);
    }, 16);
}

/* ─── Hero stats ─── */
function renderHeroStats(report) {
    const cov = report.coverage_percentage || 0;
    document.getElementById('statCoverageVal').textContent = cov.toFixed(1) + '%';
    const covBadge = document.getElementById('statCoverageBadge');
    if (cov >= 70) { covBadge.textContent = '✓ Good'; covBadge.className = 'stat-badge badge-good'; }
    else if (cov >= 50) { covBadge.textContent = '⚠ Below Target'; covBadge.className = 'stat-badge badge-warn'; }
    else { covBadge.textContent = '✗ Critical'; covBadge.className = 'stat-badge badge-danger'; }

    const sec = report.security_summary || {};
    const total = (sec.critical || 0) + (sec.high || 0) + (sec.medium || 0) + (sec.low || 0);
    document.getElementById('statSecurityVal').textContent = total;
    const secBadge = document.getElementById('statSecurityBadge');
    if (sec.critical > 0) { secBadge.textContent = '🚨 Critical Found'; secBadge.className = 'stat-badge badge-danger'; }
    else if (sec.high > 0) { secBadge.textContent = '⚠ High Found'; secBadge.className = 'stat-badge badge-warn'; }
    else { secBadge.textContent = '✓ No High+'; secBadge.className = 'stat-badge badge-good'; }

    document.getElementById('statHotspots').textContent = (report.uncovered_hotspots || []).length;
    document.getElementById('statSuggestions').textContent = (report.suggested_test_cases || []).length;
}

/* ─── Security severity grid ─── */
function renderSecurity(summary) {
    const s = summary || {};
    const levels = [
        { key: 'critical', label: 'Critical', cls: 'sev-critical' },
        { key: 'high', label: 'High', cls: 'sev-high' },
        { key: 'medium', label: 'Medium', cls: 'sev-medium' },
        { key: 'low', label: 'Low', cls: 'sev-low' }
    ];
    document.getElementById('severityGrid').innerHTML = levels.map(l => `
    <div class="sev-pill ${l.cls}">
      <div class="sev-count">${s[l.key] || 0}</div>
      <div class="sev-label">${l.label}</div>
    </div>`).join('');
}

/* ─── Coverage metrics bars ─── */
function renderCoverageMetrics(report) {
    const metrics = [
        { label: 'Overall Coverage', value: report.coverage_percentage || 0 },
        { label: 'Coverage Risk', value: 100 - (report.metrics?.coverage_risk || 0) },
        { label: 'Security Health', value: 100 - (report.metrics?.security_risk || 0) },
        { label: 'Project Health', value: report.risk_score || 0 }
    ];
    document.getElementById('coverageMetrics').innerHTML = metrics.map(m => {
        const pct = Math.min(100, Math.max(0, m.value)).toFixed(1);
        return `
      <div class="coverage-bar-wrap">
        <div class="coverage-bar-label"><span>${m.label}</span><span>${pct}%</span></div>
        <div class="coverage-bar-bg">
          <div class="coverage-bar-fill" style="width:0%" data-target="${pct}"></div>
        </div>
      </div>`;
    }).join('');

    // Animate bars after next paint
    requestAnimationFrame(() => {
        document.querySelectorAll('.coverage-bar-fill').forEach(el => {
            el.style.width = el.dataset.target + '%';
        });
    });
}

/* ─── Files below threshold ─── */
function renderFiles(files) {
    if (!files.length) {
        document.getElementById('filesCard').classList.add('hidden');
        return;
    }
    document.getElementById('filesList').innerHTML = files.map(f => {
        const cls = f.coverage < 50 ? 'low' : 'mid';
        return `
      <div class="file-row">
        <div>
          <div class="file-name">${f.file}</div>
          <div class="file-meta">${f.missed_lines} line(s) uncovered</div>
        </div>
        <div class="cov-chip ${cls}">${f.coverage.toFixed(1)}%</div>
      </div>`;
    }).join('');
}

/* ─── Hotspots ─── */
function renderHotspots(hotspots) {
    if (!hotspots.length) {
        document.getElementById('hotspotsCard').classList.add('hidden');
        return;
    }
    document.getElementById('hotspotsList').innerHTML =
        hotspots.map(h => `<div class="hotspot-pill">${h}</div>`).join('');
}

/* ─── Suggested test cases ─── */
function renderTestCases(cases) {
    document.getElementById('testCasesList').innerHTML = cases.map(c => `
    <div class="test-card">
      <div class="test-card-header">
        <div>
          <div class="test-file">${c.file}</div>
          <div class="test-func">${c.uncovered_function || c.function || 'Unknown function'}</div>
        </div>
      </div>
      <ul class="test-list">
        ${(c.suggested_tests || c.tests || []).map(t => `<li>${t}</li>`).join('')}
      </ul>
    </div>`).join('');
}

/* ─── Recommendations ─── */
function renderRecommendations(recs) {
    document.getElementById('recommendationsList').innerHTML = recs.map((r, i) => `
    <div class="rec-item">
      <div class="rec-num">${i + 1}</div>
      <div>${r}</div>
    </div>`).join('');
}
