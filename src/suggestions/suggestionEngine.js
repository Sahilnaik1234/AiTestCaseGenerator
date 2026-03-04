require('dotenv').config();
const Groq = require('groq-sdk');

const GROQ_MODEL = 'llama-3.3-70b-versatile';

/** Fallback heuristic suggestions when Groq is unavailable */
function heuristicSuggestions(funcName) {
    const lowerName = funcName.toLowerCase();
    if (lowerName.includes('validate') || lowerName.includes('check')) {
        return [
            'Test null or empty input',
            'Test invalid format/characters',
            'Test boundary/limit conditions (max/min length)',
            'Test successful validation with valid input',
            'Test XSS/injection-style input strings'
        ];
    }
    if (lowerName.includes('save') || lowerName.includes('update') || lowerName.includes('create')) {
        return [
            'Test database connection failure',
            'Test duplicate record conflict',
            'Test with partial / missing required fields',
            'Test concurrent write (race condition)',
            'Test successful persistence and verify stored value'
        ];
    }
    if (lowerName.includes('login') || lowerName.includes('auth') || lowerName.includes('token')) {
        return [
            'Test incorrect credentials',
            'Test expired or malformed token',
            'Test account lockout after multiple failed attempts',
            'Test successful authentication flow',
            'Test privilege escalation attempt'
        ];
    }
    if (lowerName.includes('delete') || lowerName.includes('remove')) {
        return [
            'Test delete of non-existent record',
            'Test delete with invalid/null ID',
            'Test cascading deletes if applicable',
            'Test successful deletion and verify record is gone'
        ];
    }
    if (lowerName.includes('payment') || lowerName.includes('refund') || lowerName.includes('charge')) {
        return [
            'Test zero or negative amount',
            'Test invalid card or payment details',
            'Test payment gateway timeout/failure',
            'Test idempotency (duplicate payment request)',
            'Test successful payment and verify confirmation'
        ];
    }
    return [
        'Test with null/undefined parameters',
        'Test boundary values (min, max, empty)',
        'Test error/exception handling paths',
        'Test expected happy path',
        'Test with unexpected data types'
    ];
}

/**
 * Uses Groq (llama-3.3-70b-versatile) to generate context-aware test suggestions.
 * Falls back to heuristics if GROQ_API_KEY is not set.
 */
async function getGroqSuggestions(file, funcName, sourceContext) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey || apiKey === 'your_groq_api_key_here') {
        return { suggestions: heuristicSuggestions(funcName), source: 'heuristic' };
    }

    try {
        const groq = new Groq({ apiKey });
        const prompt = `You are a senior QA engineer. A developer needs test case ideas for an uncovered function.

File: ${file}
Function: ${funcName}
${sourceContext ? `Source context:\n\`\`\`\n${sourceContext}\n\`\`\`` : ''}

Generate exactly 5 concise, specific test scenarios for this function.
Focus on: null/empty inputs, boundary conditions, error paths, security edge cases, and the happy path.
Output ONLY a JSON array of strings. No explanation. No code. Example:
["Test null input", "Test empty string", "Test max length boundary"]`;

        const chat = await groq.chat.completions.create({
            model: GROQ_MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 300,
            response_format: { type: 'json_object' }
        });

        const raw = chat.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(raw);
        // Groq returns a JSON object — extract the array
        const testsArray = Array.isArray(parsed) ? parsed
            : parsed.tests || parsed.test_cases || parsed.suggestions
            || Object.values(parsed).find(v => Array.isArray(v))
            || [];

        if (testsArray.length === 0) throw new Error('Empty response from Groq');
        return { suggestions: testsArray.slice(0, 5), source: 'groq' };
    } catch (err) {
        console.warn(`  ⚠ Groq fallback for ${funcName}: ${err.message}`);
        return { suggestions: heuristicSuggestions(funcName), source: 'heuristic-fallback' };
    }
}

/**
 * Main entry — generates suggestions for all uncovered functions.
 * Reads optional source files to give Groq more context.
 */
async function generateSuggestions(uncoveredFunctions, sourceRoots = []) {
    const fs = require('fs');
    const path = require('path');
    const suggestions = [];

    for (const func of uncoveredFunctions) {
        // Try to find the source file for context
        let sourceContext = null;
        for (const root of sourceRoots) {
            const candidate = path.join(root, func.file);
            if (fs.existsSync(candidate)) {
                const lines = fs.readFileSync(candidate, 'utf8').split('\n');
                const startLine = Math.max(0, (parseInt(func.line) || 1) - 3);
                const endLine = Math.min(lines.length, startLine + 20);
                sourceContext = lines.slice(startLine, endLine).join('\n');
                break;
            }
        }

        const { suggestions: tests, source } = await getGroqSuggestions(
            func.file, func.name, sourceContext
        );

        suggestions.push({
            file: func.file,
            uncovered_function: func.name,
            line: func.line,
            suggested_tests: tests,
            ai_source: source
        });
    }

    return suggestions;
}

module.exports = { generateSuggestions };
