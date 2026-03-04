const fs = require('fs');

/**
 * Flexible JaCoCo/Cobertura-compatible XML parser (no external dependencies).
 * Works for Java, Python, Go, JavaScript, or any language that produces
 * coverage XML in JaCoCo/Cobertura format.
 */

/** Extract a named attribute value from a raw attribute string */
function getAttribute(attrStr, name) {
    const re = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`);
    const m = re.exec(attrStr);
    return m ? m[1] : null;
}

/**
 * Find all <counter type="LINE" ...> tags in a block of XML text.
 * Returns an array of {missed, covered} objects.
 */
function findLineCounters(xmlBlock) {
    const re = /<\s*counter\s+([^>]+?)\s*(?:\/>|>\s*<\/\s*counter\s*>)/g;
    const result = [];
    let m;
    while ((m = re.exec(xmlBlock)) !== null) {
        if (getAttribute(m[1], 'type') === 'LINE') {
            const missed = parseInt(getAttribute(m[1], 'missed'), 10);
            const covered = parseInt(getAttribute(m[1], 'covered'), 10);
            if (!isNaN(missed) && !isNaN(covered)) {
                result.push({ missed, covered });
            }
        }
    }
    return result;
}

function parseJacoco(xmlPath) {
    try {
        const content = fs.readFileSync(xmlPath, 'utf8');

        // ── Overall coverage ──────────────────────────────────────────────────
        const allCounters = findLineCounters(content);
        const last = allCounters[allCounters.length - 1];
        let overallPercentage = 0;
        if (last && (last.missed + last.covered) > 0) {
            overallPercentage = (last.covered / (last.missed + last.covered)) * 100;
        }

        const filesBelowThreshold = [];
        const uncoveredFunctions = [];

        // ── Per-class analysis ────────────────────────────────────────────────
        // Handles both JaCoCo (sourcefilename) and Cobertura (filename)
        const classRe = /<\s*class\s+([^>]+?)>([\s\S]*?)<\/\s*class\s*>/g;
        let classMatch;
        while ((classMatch = classRe.exec(content)) !== null) {
            const attrs = classMatch[1];
            const classBody = classMatch[2];
            const sourceFile = getAttribute(attrs, 'sourcefilename') || getAttribute(attrs, 'filename');
            if (!sourceFile) continue;

            // Class-level LINE counter (last one in the block = class total)
            const clsCounters = findLineCounters(classBody);
            if (clsCounters.length > 0) {
                const c = clsCounters[clsCounters.length - 1];
                const total = c.missed + c.covered;
                if (total > 0) {
                    const pct = (c.covered / total) * 100;
                    if (pct < 70) {
                        filesBelowThreshold.push({
                            file: sourceFile,
                            coverage: Math.round(pct * 100) / 100,
                            missed_lines: c.missed
                        });
                    }
                }
            }

            // ── Per-method analysis ───────────────────────────────────────────
            const methodRe = /<\s*method\s+([^>]+?)>([\s\S]*?)<\/\s*method\s*>/g;
            let methodMatch;
            while ((methodMatch = methodRe.exec(classBody)) !== null) {
                const mAttrs = methodMatch[1];
                const mBody = methodMatch[2];
                const mName = getAttribute(mAttrs, 'name');
                const mLine = getAttribute(mAttrs, 'line');
                if (!mName) continue;

                const mCounters = findLineCounters(mBody);
                if (mCounters.length > 0 && mCounters[0].missed > 0) {
                    uncoveredFunctions.push({
                        file: sourceFile,
                        name: mName,
                        line: mLine || '?'
                    });
                }
            }
        }

        return {
            overall_percentage: Math.round(overallPercentage * 100) / 100,
            files_below_threshold: filesBelowThreshold,
            uncovered_functions: uncoveredFunctions
        };
    } catch (e) {
        return { error: e.message };
    }
}

module.exports = { parseJacoco };
