/**
 * Minimal unit test runner (no external dependencies)
 * Run with: node tests/runner.js
 */

const { parseJacoco } = require('../src/parsers/coverageParser');
const { parseSarif } = require('../src/parsers/securityParser');
const { calculateRiskScores, getRecommendations } = require('../src/analysis/riskScorer');
const { generateSuggestions } = require('../src/suggestions/suggestionEngine');
const path = require('path');

let passed = 0, failed = 0;

async function test(name, fn) {
    try {
        await fn(); // Await the function call, as it might return a Promise
        console.log(`  ✅  ${name}`);
        passed++;
    } catch (e) {
        console.log(`  ❌  ${name}\n       ${e.message}`);
        failed++;
    }
}

function assert(condition, msg) {
    if (!condition) throw new Error(msg || 'Assertion failed');
}

const SAMPLE_COVERAGE = path.join(__dirname, '../samples/coverage.xml');
const SAMPLE_SECURITY = path.join(__dirname, '../samples/security-report.sarif');

async function runTests() {
    /* ━━━ Coverage Parser ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    console.log('\n📊 Coverage Parser Tests');

    await test('Returns overall_percentage as a number', () => {
        const r = parseJacoco(SAMPLE_COVERAGE);
        assert(!r.error, r.error);
        assert(typeof r.overall_percentage === 'number', 'Expected number');
    });

    await test('Coverage is between 0 and 100', () => {
        const r = parseJacoco(SAMPLE_COVERAGE);
        assert(r.overall_percentage >= 0 && r.overall_percentage <= 100,
            `Unexpected: ${r.overall_percentage}`);
    });

    await test('Detects files below 70% threshold', () => {
        const r = parseJacoco(SAMPLE_COVERAGE);
        assert(Array.isArray(r.files_below_threshold), 'Expected array');
        assert(r.files_below_threshold.length > 0, 'Should detect at least 1 file below 70%');
    });

    await test('Returns uncovered_functions array', () => {
        const r = parseJacoco(SAMPLE_COVERAGE);
        assert(Array.isArray(r.uncovered_functions), 'Expected array');
    });

    await test('Returns error for missing file', () => {
        const r = parseJacoco('/nonexistent/path.xml');
        assert(r.error, 'Should return error for missing file');
    });

    /* ━━━ Security Parser ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    console.log('\n🛡️  Security Parser Tests');

    await test('Returns summary with severity buckets', () => {
        const r = parseSarif(SAMPLE_SECURITY);
        assert(!r.error, r.error);
        assert(typeof r.summary === 'object', 'Expected object');
        ['critical', 'high', 'medium', 'low'].forEach(k =>
            assert(typeof r.summary[k] === 'number', `Expected number for ${k}`));
    });

    await test('Detects hotspots array', () => {
        const r = parseSarif(SAMPLE_SECURITY);
        assert(Array.isArray(r.hotspots) && r.hotspots.length > 0, 'Expected hotspots');
    });

    await test('Maps SARIF "error" level to high severity', () => {
        const r = parseSarif(SAMPLE_SECURITY);
        assert(r.summary.high >= 1, 'Expected at least 1 high severity issue');
    });

    await test('Returns error for missing file', () => {
        const r = parseSarif('/nonexistent/sarif.json');
        assert(r.error, 'Should return error for missing file');
    });

    /* ━━━ Risk Scorer ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    console.log('\n⚡ Risk Scorer Tests');

    const mockCoverage = { overall_percentage: 50, files_below_threshold: [{ file: 'A.java' }] };
    const mockSecurity = { summary: { critical: 0, high: 2, medium: 1, low: 0 }, hotspots: [{}] };

    await test('project_health is between 0 and 100', () => {
        const r = calculateRiskScores(mockCoverage, mockSecurity);
        assert(r.project_health >= 0 && r.project_health <= 100, `Got ${r.project_health}`);
    });

    await test('100% coverage and no vulns gives health 100', () => {
        const r = calculateRiskScores(
            { overall_percentage: 100, files_below_threshold: [] },
            { summary: { critical: 0, high: 0, medium: 0, low: 0 }, hotspots: [] }
        );
        assert(r.project_health === 100, `Expected 100, got ${r.project_health}`);
    });

    await test('0% coverage gives maximum coverage risk', () => {
        const r = calculateRiskScores(
            { overall_percentage: 0, files_below_threshold: [] },
            { summary: { critical: 0, high: 0, medium: 0, low: 0 }, hotspots: [] }
        );
        assert(r.coverage_risk === 100, `Expected 100, got ${r.coverage_risk}`);
    });

    await test('Generates recommendations for low coverage', () => {
        const recs = getRecommendations(mockCoverage, mockSecurity);
        assert(recs.length > 0, 'Expected at least 1 recommendation');
        assert(recs.some(r => r.includes('70%')), 'Should mention 70% threshold');
    });

    /* ━━━ Suggestion Engine ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    console.log('\n💡 Suggestion Engine Tests');

    await test('Returns suggestions for validate function', async () => {
        const r = await generateSuggestions([{ file: 'UserService.java', name: 'validateInput', line: '10' }]);
        assert(r.length === 1, 'Expected 1 suggestion group');
        assert(r[0].suggested_tests.some(t => t.includes('null')), 'Should suggest null test');
    });

    await test('Returns suggestions for login function', async () => {
        const r = await generateSuggestions([{ file: 'AuthService.java', name: 'login', line: '20' }]);
        assert(r[0].suggested_tests.some(t => t.toLowerCase().includes('credentials')), 'Should suggest credentials test');
    });

    await test('Returns generic tests for unknown function', async () => {
        const r = await generateSuggestions([{ file: 'Foo.java', name: 'doSomething', line: '5' }]);
        assert(r[0].suggested_tests.length > 0, 'Should return at least one generic test');
    });

    await test('Returns empty array for empty input', async () => {
        const r = await generateSuggestions([]);
        assert(Array.isArray(r) && r.length === 0, 'Expected empty array');
    });

    /* ━━━ Summary ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`  Tests: ${passed + failed} | ✅ Passed: ${passed} | ❌ Failed: ${failed}`);
    console.log(`${'─'.repeat(50)}\n`);

    if (failed > 0) process.exit(1);
}

runTests();
