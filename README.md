# VisionQA — Autonomous Visual UI & End-to-End Testing Agent

> **An AI agent that visually understands websites using Gemini and autonomously performs QA testing using browser automation, deployed on Google Cloud.**

[![Built with Gemini](https://img.shields.io/badge/Built%20with-Gemini%202.0%20Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Google Cloud](https://img.shields.io/badge/Deployed%20on-Google%20Cloud-4285F4?style=for-the-badge&logo=googlecloud&logoColor=white)](https://cloud.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

---

## 🎯 Problem

Modern UI testing tools (Selenium, Cypress, Playwright) require engineers to **manually write fragile test scripts** tied to DOM selectors. This leads to:

- **Fragile tests** — UI changes break selectors constantly
- **Time-intensive** — writing E2E tests takes significant engineering effort
- **Limited coverage** — many UI flows remain untested
- **Difficult maintenance** — tests must be updated with every UI change

## 💡 Solution

VisionQA is an **AI-powered autonomous QA platform** that replaces manual test scripting. Developers simply provide:

1. **A website URL**
2. **A testing objective** (in plain English)

VisionQA then autonomously:

| Agent | What it does |
|-------|-------------|
| 🕷️ **Site Structure Agent** | BFS-crawls the website, discovers all pages and routes |
| 👁️ **Visual UI Agent** | Analyzes UI elements using Gemini Vision — no DOM selectors needed |
| 🧪 **Test Generation Agent** | Generates intelligent E2E test cases from structure + UI analysis |
| 🤖 **Execution Agent** | Runs tests via Playwright headless browser, captures screenshots |
| 📊 **Report Agent** | Produces a comprehensive QA report with AI executive summary |

---

## 🏗️ Architecture

```
┌──────────────┐     ┌───────────────────────────────────────────────────┐
│   Developer  │     │              Google Cloud Platform                │
│   Browser    │     │                                                   │
│              │     │  ┌─────────────────────────────────────────────┐  │
│  ┌────────┐  │     │  │     Backend API (Cloud Run / FastAPI)       │  │
│  │Next.js │──┼─────┼──│                                             │  │
│  │Frontend│  │     │  │  ┌──────────────────────────────────────┐   │  │
│  └────────┘  │     │  │  │      Agent Orchestrator Pipeline     │   │  │
│              │     │  │  │                                      │   │  │
│              │     │  │  │  Site Structure → Visual UI →         │   │  │
│              │     │  │  │  Test Generation → Execution →        │   │  │
│              │     │  │  │  Report Generation                    │   │  │
│              │     │  │  └────────────┬─────────────────────────┘   │  │
│              │     │  │               │                             │  │
│              │     │  └───────────────┼─────────────────────────────┘  │
│              │     │                  │                                │
│  ┌────────┐  │     │  ┌──────────┐  ┌┴──────────┐  ┌──────────────┐  │
│  │  CLI   │──┼─────┼──│ Gemini   │  │ Firestore │  │Cloud Storage │  │
│  │ Runner │  │     │  │ 2.0 Flash│  │ Database  │  │ (Screenshots)│  │
│  └────────┘  │     │  └──────────┘  └───────────┘  └──────────────┘  │
└──────────────┘     └───────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|-----------|
| **AI Model** | Gemini 2.0 Flash (Multimodal — text + vision) |
| **Agent SDK** | Google GenAI SDK (`google-genai`) |
| **Backend** | Python FastAPI on Google Cloud Run |
| **Frontend** | Next.js 14 + React 18 + Tailwind CSS |
| **Browser Automation** | Playwright (headless Chromium) |
| **Database** | Google Cloud Firestore |
| **File Storage** | Google Cloud Storage |
| **Authentication** | JWT + bcrypt |
| **Real-time** | Server-Sent Events (SSE) + WebSocket |
| **CLI** | Node.js + Commander.js |
| **Deployment** | Google Cloud Run + Cloud Build |

---

## 🚀 Quick Start (Local Development)

### Prerequisites

- Python 3.11+
- Node.js 18+
- A [Gemini API Key](https://aistudio.google.com/apikey) (free)

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/visionqa.git
cd visionqa
```

### 2. Set up the backend

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# Install dependencies
pip install -r requirements.txt

# Install Playwright browser
TMPDIR=/tmp python -m playwright install chromium

# Configure environment
cp .env.example .env
# Edit .env and add your VISIONQA_GOOGLE_API_KEY
```

Edit `backend/.env` and set your Gemini API key:

```env
VISIONQA_GOOGLE_API_KEY=your-gemini-api-key-here
VISIONQA_LOCAL_MODE=true
```

### 3. Start the backend

```bash
# From the project root directory:
cd ..
source backend/venv/bin/activate
PYTHONPATH=$(pwd) python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

You should see: `Uvicorn running on http://0.0.0.0:8000`

### 4. Set up and start the frontend

```bash
# In a new terminal:
cd frontend
npm install
npm run dev
```

You should see: `Ready on http://localhost:3000`

### 5. Use VisionQA

1. Open **http://localhost:3000** in your browser
2. **Register** a new account
3. Click **"New Test Session"**
4. Enter a website URL (e.g., `https://example.com`)
5. Enter a testing objective (e.g., "Test all navigation links and page loads")
6. Click **"Start AI Testing"**
7. Watch the **Live Pipeline** — 5 AI agents work sequentially in real-time
8. View the **QA Report** with pass/fail results, donut chart, and AI recommendations

---

## ☁️ Google Cloud Deployment

### Prerequisites

- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed
- A GCP project with billing enabled

### Deploy with one command

```bash
chmod +x deploy.sh
./deploy.sh YOUR_GCP_PROJECT_ID
```

This script automatically:
1. Enables required APIs (Cloud Run, Firestore, Storage, Vertex AI)
2. Creates Firestore database and Cloud Storage bucket
3. Builds and deploys backend to Cloud Run
4. Builds and deploys frontend to Cloud Run
5. Configures CORS between frontend and backend

### Or deploy with Cloud Build

```bash
gcloud builds submit --config cloudbuild.yaml --project YOUR_PROJECT_ID
```

### Production Environment Variables

For production (GCP), set `VISIONQA_LOCAL_MODE=false` and configure:

```env
VISIONQA_GCP_PROJECT_ID=your-project-id
VISIONQA_GCP_REGION=us-central1
VISIONQA_LOCAL_MODE=false
VISIONQA_GCS_BUCKET=your-bucket-name
VISIONQA_JWT_SECRET=your-production-secret
VISIONQA_FRONTEND_URL=https://your-frontend-url.run.app
```

---

## 📋 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Register new user |
| `POST` | `/auth/login` | Login and get JWT token |
| `POST` | `/sessions` | Create and auto-start testing session |
| `GET` | `/sessions` | List all user sessions |
| `GET` | `/sessions/{id}` | Get session details |
| `GET` | `/sessions/{id}/stream` | SSE stream of live pipeline status |
| `GET` | `/sessions/{id}/testcases` | Get generated test cases |
| `POST` | `/sessions/{id}/execute` | Re-run a session |
| `GET` | `/reports/{id}` | Get QA report |
| `GET` | `/health` | Health check |

---

## 📁 Project Structure

```
visionqa/
├── backend/
│   ├── agents/                 # AI Agent implementations
│   │   ├── orchestrator.py     # Pipeline coordinator
│   │   ├── site_structure.py   # BFS web crawler
│   │   ├── visual_ui.py        # Gemini Vision UI analyzer
│   │   ├── test_generator.py   # AI test case generator
│   │   ├── execution.py        # Playwright test executor
│   │   └── report.py           # AI report generator
│   ├── api/
│   │   ├── routes/             # FastAPI route handlers
│   │   │   ├── auth.py         # Registration + Login
│   │   │   ├── sessions.py     # Session CRUD + SSE streaming
│   │   │   └── reports.py      # Report retrieval
│   │   ├── deps.py             # Auth dependencies
│   │   └── websocket.py        # WebSocket for CLI runner
│   ├── models/                 # Pydantic request/response models
│   ├── services/
│   │   ├── gemini.py           # Gemini API client (Vertex AI + API Key)
│   │   ├── firestore.py        # Database (Firestore + local fallback)
│   │   └── storage.py          # File storage (GCS + local fallback)
│   ├── utils/auth.py           # JWT + bcrypt utilities
│   ├── config.py               # Settings management
│   ├── main.py                 # FastAPI app entry point
│   ├── Dockerfile              # Backend container
│   └── requirements.txt        # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx            # Landing page
│   │   │   ├── login/page.tsx      # Login
│   │   │   ├── register/page.tsx   # Registration
│   │   │   ├── dashboard/page.tsx  # Dashboard with stats
│   │   │   ├── new-session/page.tsx # New test form
│   │   │   └── session/[id]/live/  # Live agent pipeline (animated)
│   │   ├── components/
│   │   │   ├── Navbar.tsx          # Navigation bar
│   │   │   ├── ReportView.tsx      # Report with donut chart
│   │   │   ├── SessionCard.tsx     # Session list cards
│   │   │   └── SiteStructureTree.tsx # Site map tree view
│   │   └── lib/
│   │       ├── api.ts              # API client + SSE streaming
│   │       └── auth.tsx            # Auth context provider
│   ├── Dockerfile              # Frontend container
│   └── package.json
├── cli/                        # CLI test runner (Node.js)
│   └── src/
│       ├── index.ts            # CLI commands
│       ├── executor.ts         # Playwright test executor
│       ├── websocket.ts        # WebSocket connection to backend
│       └── screenshot.ts       # Screenshot capture utility
├── deploy.sh                   # One-click GCP deployment script
├── cloudbuild.yaml             # Cloud Build configuration
└── README.md                   # This file
```

---

## 🎬 Demo Flow

1. **Landing Page** → See product overview and feature highlights
2. **Register/Login** → Create an account with JWT authentication
3. **New Session** → Enter URL + testing objective
4. **Live Pipeline** → Watch 5 AI agents work in real-time:
   - 🕷️ Site Structure Agent discovers pages
   - 👁️ Visual UI Agent analyzes elements
   - 🧪 Test Generator creates test cases
   - 🤖 Execution Agent runs Playwright tests
   - 📊 Report Generator synthesizes results
5. **QA Report** → View pass/fail stats, donut chart, expandable test rows, AI recommendations

---

## 🏆 Hackathon: Gemini Live Agent Challenge

This project is submitted for the **UI Navigator** category:

> *Build an agent that becomes the user's hands on screen. The agent observes the browser or device display, interprets visual elements, and performs actions based on user intent.*

### Requirements Met

| Requirement | Implementation |
|-------------|---------------|
| ✅ Gemini model | Gemini 2.0 Flash for vision analysis + test generation + report synthesis |
| ✅ Google GenAI SDK | `google-genai` library for all AI interactions |
| ✅ Google Cloud service | Cloud Run, Firestore, Cloud Storage, Vertex AI |
| ✅ Multimodal input | Screenshots analyzed by Gemini Vision |
| ✅ Agent architecture | 5-agent pipeline with orchestrator |
| ✅ Executable actions | Playwright browser automation from AI-generated test cases |
| ✅ Reproducible | Complete setup instructions in README |
| ✅ Automated deployment | `deploy.sh` + `cloudbuild.yaml` |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

*Built with ❤️ using Google Gemini, Google Cloud, and Playwright*
