require('dotenv').config();
const fs = require('fs');
const path = require('path');

const { parseJacoco } = require('./src/parsers/coverageParser');
const { parseSarif } = require('./src/parsers/securityParser');
const { calculateRiskScores, getRecommendations } = require('./src/analysis/riskScorer');
const { generateSuggestions } = require('./src/suggestions/suggestionEngine');

function parseArgs(argv) {
    const map = {};
    for (let i = 0; i < argv.length; i += 2) {
        if (argv[i] && argv[i].startsWith('--')) map[argv[i].slice(2)] = argv[i + 1];
    }
    return map;
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const coveragePath = args.coverage;
    const securityPath = args.security;
    const outputPath = args.output || 'output/quality-report.json';
    // Optional: comma-separated list of source root directories for Groq context
    const sourceRoots = args.sources ? args.sources.split(',') : ['.', 'src', 'lib', 'app'];

    if (!coveragePath || !securityPath) {
        console.error('Usage: node main.js --coverage <path> --security <path> [--output <path>] [--sources <dir1,dir2>]');
        process.exit(1);
    }

    const usingGroq = process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here';
    console.log(`\n🔍 AI Quality Intelligence Engine`);
    console.log(`   Model : ${usingGroq ? 'Groq llama-3.3-70b-versatile' : 'Heuristic (set GROQ_API_KEY to enable AI)'}`);
    console.log(`   Coverage : ${coveragePath}`);
    console.log(`   Security : ${securityPath}\n`);

    // ── 1. Coverage Analysis ─────────────────────────────────────────────────
    console.log('📊 Parsing coverage report...');
    const coverageData = parseJacoco(coveragePath);
    if (coverageData.error) { console.error(`Error: ${coverageData.error}`); process.exit(1); }

    // ── 2. Security Analysis ─────────────────────────────────────────────────
    console.log('🛡️  Parsing security report...');
    const securityData = parseSarif(securityPath);
    if (securityData.error) { console.error(`Error: ${securityData.error}`); process.exit(1); }

    // ── 3. Risk Scoring ──────────────────────────────────────────────────────
    const riskInfo = calculateRiskScores(coverageData, securityData);
    const recommendations = getRecommendations(coverageData, securityData);

    // ── 4. AI Test Suggestions (Groq) ────────────────────────────────────────
    console.log(`💡 Generating test suggestions via ${usingGroq ? 'Groq AI' : 'heuristics'}...`);
    const topUncovered = coverageData.uncovered_functions.slice(0, 5);
    const suggestedTestCases = await generateSuggestions(topUncovered, sourceRoots);

    // ── 5. Hotspot Detection ─────────────────────────────────────────────────
    const hotspots = coverageData.uncovered_functions
        .filter(f => ['auth', 'login', 'db', 'save', 'validate', 'pay', 'delete', 'token']
            .some(k => f.name.toLowerCase().includes(k)))
        .slice(0, 10)
        .map(f => `${f.file}: ${f.name} (High Risk — Uncovered)`);

    // ── 6. Assemble Report ───────────────────────────────────────────────────
    const report = {
        generated_at: new Date().toISOString(),
        ai_model: usingGroq ? 'groq/llama-3.3-70b-versatile' : 'heuristic',
        coverage_percentage: coverageData.overall_percentage,
        files_below_threshold: coverageData.files_below_threshold,
        uncovered_hotspots: hotspots,
        security_summary: securityData.summary,
        security_hotspots: securityData.hotspots,
        suggested_test_cases: suggestedTestCases,
        risk_score: riskInfo.project_health,
        recommendations,
        metrics: {
            coverage_risk: riskInfo.coverage_risk,
            security_risk: riskInfo.security_risk
        }
    };

    // ── 7. Write Output ──────────────────────────────────────────────────────
    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

    console.log(`\n✅ Report saved → ${outputPath}`);
    console.log(`   Project Health Score : ${report.risk_score}/100`);
    console.log(`   Coverage             : ${report.coverage_percentage}%`);
    console.log(`   Security Issues      : ${Object.values(securityData.summary).reduce((a, b) => a + b, 0)} total\n`);
}

main().catch(err => { console.error(err); process.exit(1); });
