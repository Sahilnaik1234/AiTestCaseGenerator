# 🧠 AI Quality Intelligence Engine

A language-agnostic **Pre-CI Quality Assistant** that analyzes coverage and security reports to automatically provide structured quality insights, risk scoring, and context-aware test case suggestions using **Groq AI (Llama 3)**.

## 🎯 Features
- **Auto-Detection CI Pipeline**: GitHub Actions automatically detects Java, Go, Python, and Node.js projects, runs the coverage + SAST tools, and calls the engine.
- **Coverage Gap Analysis**: Identifies files below a 70% threshold and detects uncovered functions.
- **Security Hotspot Detection**: Parses SARIF reports (Semgrep, GoSec, Bandit, etc.) to categorize vulnerabilities.
- **Groq AI Test Suggestions**: Reads the actual source code context around uncovered functions and uses `llama-3.3-70b-versatile` to suggest precise edge cases and happy path tests. (Fails gracefully to heuristics if no API key is provided).
- **Project Health Score**: Calculates a Combined Health Score (0-100) combining coverage metrics and security weightings.
- **Web Dashboard**: Interactive dark-glassmorphism dashboard to visualize the JSON output offline.

---

## 🚀 Setup & Usage (Local)

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Set up AI (Optional)**: If you want intelligent AI test case suggestions instead of heuristics, create a `.env` file with your Groq API key:
   ```bash
   GROQ_API_KEY=gsk_your_key_here
   ```
3. **Run the Engine**:
   ```bash
   # Will output to quality-report.json by default
   node main.js \
     --coverage samples/coverage.xml \
     --security samples/security-report.sarif \
     --output output/quality-report.json \
     --sources src/
   ```
4. **View Dashboard**:
   ```bash
   npm run dashboard
   # Then open http://localhost:3000
   ```
5. **Run Unit Tests (17 tests, 0 dependencies)**:
   ```bash
   npm test
   ```

---

## 🤖 Setup in GitHub Actions

The provided `.github/workflows/quality-gate.yml` is **fully automatic**. You do not need to configure build commands.

1. Go to your repository **Settings** → **Secrets and variables** → **Actions**.
2. Click **New repository secret**.
3. Name: `GROQ_API_KEY`
4. Secret: Paste your Groq API key (starts with `gsk_...`).
5. Push code!

The Action will automatically post a PR comment like this if you open a PR:

> ## ⚠️ AI Quality Intelligence Report
> | Metric | Value |
> |--------|-------|
> | 🧠 AI Model | `groq/llama-3.3-70b-versatile` |
> | 💯 Project Health | **45/100** |
> | 📊 Coverage | 25.8% |
> | 🔒 Security Issues | 3 total |
> | ⚠ Files Below 70% | 1 |
> | 🔥 Hotspots | 3 |