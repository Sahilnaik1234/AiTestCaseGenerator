function calculateRiskScores(coverageData, securityData) {
    const coveragePerc = coverageData.overall_percentage || 0;
    const coverageRisk = 100 - coveragePerc;

    const secSummary = securityData.summary || {};
    const secPoints = (
        (secSummary.critical || 0) * 25 +
        (secSummary.high || 0) * 15 +
        (secSummary.medium || 0) * 5 +
        (secSummary.low || 0) * 1
    );
    const securityRisk = Math.min(100, secPoints);

    const coverageHealth = coveragePerc;
    const securityHealth = 100 - securityRisk;

    const projectHealth = (coverageHealth * 0.6) + (securityHealth * 0.4);

    return {
        coverage_risk: Math.round(coverageRisk * 100) / 100,
        security_risk: Math.round(securityRisk * 100) / 100,
        project_health: Math.round(projectHealth * 100) / 100
    };
}

function getRecommendations(coverageData, securityData) {
    const recommendations = [];

    if (coverageData.overall_percentage < 70) {
        recommendations.push(`Overall coverage is ${coverageData.overall_percentage}%, which is below the 70% threshold.`);
    }

    const filesBelow = coverageData.files_below_threshold || [];
    if (filesBelow.length > 0) {
        const topOffenders = filesBelow.slice(0, 3).map(f => f.file);
        recommendations.push(`Prioritize increasing coverage in: ${topOffenders.join(', ')}`);
    }

    const secSummary = securityData.summary || {};
    if (secSummary.high > 0 || secSummary.critical > 0) {
        recommendations.push("Immediate attention required for High/Critical security vulnerabilities.");
    }

    if (securityData.hotspots && securityData.hotspots.length > 0) {
        recommendations.push(`Fix the ${securityData.hotspots.length} identified security hotspots.`);
    }

    return recommendations;
}

module.exports = { calculateRiskScores, getRecommendations };
