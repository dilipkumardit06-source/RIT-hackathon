# 🚀 Optigoal Engine - AI Strategic Financial Intelligence

An autonomous, enterprise-grade strategic financial planning platform and executive command center. Optigoal Engine computes exact, un-hallucinated cash flow models in Indian Rupees (₹), analyzes goal trajectories, optimizes budget allocations, and delivers strategic financial advisory through **AWS Bedrock**.

---

## 🌟 Key Features

- **Cinematic 3D Scroll Intro**: High-DPI 300-frame canvas scroll-scrubbing animation with automated introductory playback and responsive viewport scaling.
- **Executive Overview Command Center**: Real-time financial health index, cash flow availability, 6 KPI stat cards, and dynamic budget conflict detection.
- **Resource Allocation Engine**: Visual capital distribution doughnut chart with center-hole inflow metric, percentage allocations, and micro progress bars for fixed expenses, investments, active goals, and surplus reserves.
- **Trajectory Projection**: Cumulative available capital vs required goal demand forecasting curves with selectable 6-month and 12-month projection horizons.
- **AWS Bedrock AI Strategic Advisor**:
  - Direct integration with **AWS Bedrock Converse API** supporting **Claude 3.5 Sonnet** and **Amazon Nova Pro**.
  - **Deterministic Guardrails**: Exact mathematical pre-computation in Python before model invocation to eliminate arithmetic hallucinations.
  - Interactive advisory chat stream, quick prompt inquiry chips, and real-time stress testing.
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
│  - Schema & Guardrail Context Injection │
│  - AWS Bedrock Runtime Client           │
└────────────────────┬────────────────────┘
                     │ AWS Bedrock Converse API
                     ▼
┌─────────────────────────────────────────┐
│              AWS Bedrock                │
│  - Anthropic Claude 3.5 Sonnet          │
│  - Amazon Nova Pro                      │
│  - Zero-Hallucination Heuristics        │
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
git clone https://github.com/DilipKumardevops/optigoal-engine.git
cd optigoal-engine

# (Optional) Install boto3 for AWS Bedrock integration
pip install boto3
```

### 3. Configure Environment (Optional)
Copy `.env.example` to `.env` to configure your AWS Bedrock credentials:
```env
AWS_BEARER_TOKEN_BEDROCK="bedrock-api-key-YOUR_PLAYGROUND_TOKEN"
AWS_REGION="eu-north-1"
```
*(If no AWS credentials are configured, the engine automatically falls back to deterministic mathematical heuristics).*

### 4. Run Locally
```bash
python server.py
```
Open **`http://localhost:8000`** in your browser.

---

## 📁 Repository Structure

```
.
├── dashboard.html          # Executive dashboard & AI Advisor interface
├── index.html              # Landing page & 3D scroll animation
├── login.html              # Authentication portal (Google & Email)
├── server.py               # Backend server & AWS Bedrock API integration
├── lambda_function.py      # AWS Lambda deployment handler
├── styles.css              # Global design system & animations
├── script.js               # Core animation & client logic
├── enhanced_frames/        # 300-frame 3D sequence assets
└── js/
    ├── firebase-config.js  # Firebase configuration
    ├── intro-video.js      # Video controller
    └── scroll-animation.js # Frame scrubbing engine
```

---

## 📄 License
MIT License. Developed for the RIT Hackathon.
