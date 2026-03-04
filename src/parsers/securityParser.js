const fs = require('fs');

function parseSarif(sarifPath) {
    try {
        const data = JSON.parse(fs.readFileSync(sarifPath, 'utf8'));

        const summary = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0
        };

        const hotspots = [];

        for (const run of (data.runs || [])) {
            for (const result of (run.results || [])) {
                const level = result.level || 'warning';
                const ruleId = result.ruleId || 'unknown';
                const message = (result.message && result.message.text) || '';

                let severity = "medium";
                if (level === 'error') {
                    severity = "high";
                    summary.high += 1;
                } else if (level === 'warning') {
                    severity = "medium";
                    summary.medium += 1;
                } else {
                    severity = "low";
                    summary.low += 1;
                }

                let location = "unknown";
                if (result.locations && result.locations[0]) {
                    const loc = result.locations[0];
                    location = (loc.physicalLocation && loc.physicalLocation.artifactLocation && loc.physicalLocation.artifactLocation.uri) || 'unknown';
                }

                hotspots.push({
                    rule_id: ruleId,
                    severity: severity,
                    message: message,
                    location: location
                });
            }
        }

        return {
            summary,
            hotspots
        };
    } catch (e) {
        return { error: e.message };
    }
}

module.exports = { parseSarif };
