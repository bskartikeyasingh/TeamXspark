# AegisCampus-AI 🛡️

**AI Multi-Agent Campus Emergency Response and Resource Coordination System**

AegisCampus-AI is an intelligent emergency coordination platform designed for university campuses. It automates incident intake, AI classification & severity analysis, multi-agent dispatch planning, responder alerts, live campus resource tracking, and audit trails.

---

## 🌟 Key Features

- **🚨 Intelligent Emergency Intake**: Multimodal reporting with location normalization (e.g. N Block, Pharmacy Block, Library).
- **🤖 Multi-Agent AI Pipeline**:
  - **Incident Intelligence Agent**: Sub-second LLM classification and severity analysis powered by Groq.
  - **Specialized Response Agents**: Security, Medical, Facilities, Transport, and Communication coordination.
- **🗺️ Interactive Campus Map**: Live interactive SVG map visualizing real-time campus resources, muster points, and active incident zones.
- **⚡ Automated Resource Allocation**: Smart dispatch of campus security, ambulances, first aid teams, and shuttles with instant notifications.
- **🔒 Role-Based Access Control**: Student and Admin portals with Firebase Auth & secure session management.
- **📊 Real-time Audit & Logs**: Complete accountability with immutable incident resolution audit trails.

---

## 🏗️ Architecture Stack

- **Backend**: FastAPI (Python 3.11), Uvicorn, LangGraph / LangChain, Groq Cloud API, PyMongo
- **Frontend**: React 19, Vite, TailwindCSS, Lucide Icons, Framer Motion
- **Database**: MongoDB Atlas
- **Auth**: Firebase Authentication

---

## 🚀 Local Development Setup

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your GROQ_API_KEY and MONGODB_URI

uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env if your backend runs on a different port

npm run dev
```

---

## 🧪 Testing

Run the full end-to-end multi-agent verification pipeline:
```bash
cd backend
python test_all_phases.py
```