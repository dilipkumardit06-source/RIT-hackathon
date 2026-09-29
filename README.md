# 🚀 Optigoal Engine - AI Strategic Financial Intelligence

An autonomous, enterprise-grade strategic financial planning platform and executive command center. Optigoal Engine computes exact, un-hallucinated cash flow models in Indian Rupees (₹), analyzes goal trajectories, optimizes budget allocations, and delivers strategic financial advisory through **OpenRouter AI**.

---

## 🌟 Key Features

- **Cinematic 3D Scroll Intro**: High-DPI 300-frame canvas scroll-scrubbing animation with automated introductory playback and responsive viewport scaling.
- **Executive Overview Command Center**: Real-time financial health index, cash flow availability, 6 KPI stat cards, and dynamic budget conflict detection.
- **Resource Allocation Engine**: Visual capital distribution doughnut chart with center-hole inflow metric, percentage allocations, and micro progress bars for fixed expenses, investments, active goals, and surplus reserves.
- **Trajectory Projection**: Cumulative available capital vs required goal demand forecasting curves with selectable 6-month and 12-month projection horizons.
- **OpenRouter AI Strategic Advisor**:
  - Integration with **OpenRouter AI API** supporting **GPT-4o Mini**, **Claude 3.5 Sonnet**, and **Llama 3.3 70B**.
  - **Deterministic Guardrails**: Exact mathematical pre-computation in Python before model invocation to eliminate arithmetic hallucinations.
  - Interactive advisory chat stream, quick prompt inquiry chips, dynamic token budgeting, and real-time stress testing.
- **Firebase Cloud Persistence**: Real-time synchronization with Firebase Cloud Firestore and persistent session management.
- **Secure Authentication**: Google OAuth and Email/Password authentication.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│     Optigoal Frontend (Web Dashboard)   │
│  - Executive Overview & KPI Metrics     │
│  - Resource Allocation Doughnut         │
│  - Trajectory Curves & Goal Ledger      │
└────────────────────┬────────────────────┘
                     │ HTTPS POST /api/ai-advisor
                     ▼
┌─────────────────────────────────────────┐
│       Python Backend (server.py)        │
│  - Deterministic Financial Math Engine  │
│  - Zero-Hallucination Guardrails        │
│  - Adaptive Token Budgeting Engine      │
└────────────────────┬────────────────────┘
                     │ OpenRouter API
                     ▼
┌─────────────────────────────────────────┐
│             OpenRouter AI               │
│  - OpenAI GPT-4o Mini                   │
│  - Anthropic Claude 3.5 Sonnet          │
│  - Meta Llama 3.3 70B                   │
│  - Zero-Hallucination Grounding         │
└─────────────────────────────────────────┘
```

---

## 🛠️ Quick Start

### 1. Prerequisites
- Python 3.9+
- Git

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/dilipkumardit06-source/RIT-hackathon.git
cd RIT-hackathon
```

### 3. Configure Environment
Copy `.env.example` to `.env` to configure your OpenRouter API key:
```env
OPENROUTER_API_KEY="sk-or-v1-YOUR_OPENROUTER_KEY_HERE"
```
*(If no API key is configured, the engine automatically falls back to deterministic mathematical heuristics).*

### 4. Run Locally
```bash
python server.py
```
Open **`http://localhost:8000`** in your browser.

### 5. Firebase Cloud Database Setup (Optional / Recommended)
Optigoal Engine uses **Firebase Cloud Firestore** for persistent multi-device syncing with offline-first support.
To activate your Firestore database:
1. Open [Firebase Console](https://console.firebase.google.com/project/optigoal-engine-4905b/firestore).
2. Click **Create database** and choose your region (e.g. `asia-south1`).
3. Deploy the included `firestore.rules` for production access control.
4. Detailed instructions are available in [FIREBASE_DATABASE_SETUP.md](FIREBASE_DATABASE_SETUP.md).

---

## 📁 Repository Structure

```
.
├── dashboard.html             # Executive dashboard & AI Advisor interface
├── index.html                 # Landing page & 3D scroll animation
├── login.html                 # Authentication portal (Google & Email)
├── server.py                  # Backend server & OpenRouter AI integration
├── styles.css                 # Global design system & animations
├── script.js                  # Core animation & client logic
├── firestore.rules            # Firebase Firestore security rules
├── FIREBASE_DATABASE_SETUP.md # Firestore setup and schema documentation
├── enhanced_frames/           # 300-frame 3D sequence assets
└── js/
    ├── firebase-config.js     # Firebase configuration
    ├── firebase-db.js         # Unified Cloud Firestore database layer & offline cache
    ├── intro-video.js         # Video controller
    └── scroll-animation.js    # Frame scrubbing engine
```
