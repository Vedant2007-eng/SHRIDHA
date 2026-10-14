# CAREVOICE — Hospital Voice Feedback System Backend

Production-ready, privacy-first FastAPI backend for **CareVoice**, an AI-powered multilingual patient voice feedback kiosk system.

---

## 🏥 Architecture Overview

```
                          PATIENT KIOSK FRONTEND
                                    │
                         (Voice-to-Text Transcripts)
                                    │
                                    ▼
                         ┌────────────────────┐
                         │   FastAPI Server   │
                         │    (Port 8000)     │
                         └─────────┬──────────┘
                                   │
               ┌───────────────────┴───────────────────┐
               ▼                                       ▼
       ┌──────────────┐                       ┌─────────────────┐
       │   MongoDB    │                       │     Groq AI     │
       │ (carevoice)  │                       │ (LLaMA-3.3-70B) │
       └──────┬───────┘                       └────────┬────────┘
              │                                        │
              │         Multilingual Sentiment,        │
              │         Category Scoring, Issues,      │
              │         Patient Suggestions Extraction │
              │                                        │
              └───────────────────┬────────────────────┘
                                  ▼
                        Hospital Report Record
                                  │
                                  ▼
                         PATIENT REPORT PAGE
                         (Interactive UI + PDF)
```

---

## 🛠️ Tech Stack

- **Python 3.11+**
- **FastAPI**: Modern, high-performance async REST framework
- **Uvicorn**: Lightning-fast ASGI web server
- **Pydantic v2**: Strict data validation & schema contracts
- **MongoDB + PyMongo**: Scalable persistence for feedback sessions and clinical reports
- **Groq AI**: High-speed LLM inference (default: `llama-3.3-70b-versatile`)
- **PyTest**: Automated test suite for health, feedback flows, scoring, and analysis

---

## 📁 Folder Structure

```
backend/
├── app/
│   ├── main.py                  # FastAPI app entrypoint, CORS, exception handlers
│   ├── config.py                # Pydantic Settings & environment configuration
│   ├── database.py              # PyMongo single connection manager & indexing
│   ├── models/
│   │   ├── feedback.py          # Session, Answer, Question Pydantic models
│   │   └── report.py            # CategoryScores, HospitalReport, Envelope models
│   ├── routes/
│   │   ├── health.py            # GET /api/health
│   │   ├── feedback.py          # Session creation, questions, answers submission
│   │   └── analysis.py          # Groq AI analysis & report retrieval
│   ├── services/
│   │   ├── feedback_service.py  # Session & Report persistence operations
│   │   ├── analysis_service.py  # Groq API prompt execution & heuristic fallback
│   │   └── scoring_service.py   # Weighted score calculations & status classification
│   ├── utils/
│   │   └── validators.py        # ID generation (CV+date+digits) & JSON sanitizers
│   └── prompts/
│       └── feedback_analysis.py # 4 Central Hospital questions & AI prompts
├── tests/
│   ├── test_health.py           # Health check verification
│   ├── test_feedback.py         # Session lifecycle & validation tests
│   └── test_analysis.py         # Scoring math, Groq mocking & report tests
├── .env.example                 # Example environment variables
├── requirements.txt             # Minimal Python dependencies
└── README.md                    # Comprehensive documentation
```

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|---|---|---|
| `MONGODB_URI` | `mongodb://localhost:27017` | MongoDB connection string (Local or Atlas) |
| `MONGODB_DATABASE` | `carevoice` | Target database name |
| `GROQ_API_KEY` | *(empty / your key)* | Groq API Key for AI Analysis |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Groq Model identifier |
| `FRONTEND_URL` | `http://localhost:5173` | Allowed CORS Frontend origin |
| `PORT` | `8000` | Backend server port |

> **Note**: If `GROQ_API_KEY` is not provided or MongoDB is offline during initial local development, the backend automatically uses an intelligent in-memory fallback engine so development and testing never stall.

---

## 🚀 Installation & Running Locally

### Windows (PowerShell)

```powershell
# 1. Navigate to backend
cd backend

# 2. Create virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start backend server
uvicorn app.main:app --reload --port 8000
```

### macOS / Linux

```bash
# 1. Navigate to backend
cd backend

# 2. Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start backend server
uvicorn app.main:app --reload --port 8000
```

The API will be live at **`http://localhost:8000`**.
Interactive Swagger documentation: **`http://localhost:8000/docs`**.

---

## 📡 API Endpoints

### 1. Health Check
- **`GET /api/health`**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "CareVoice Backend",
    "version": "1.0.0"
  }
}
```

### 2. Start Feedback Session
- **`POST /api/feedback/start`**
- **Request Body**:
```json
{
  "language": "English"
}
```
- **Response**:
```json
{
  "success": true,
  "data": {
    "feedback_id": "CV2610058492",
    "language": "English"
  }
}
```

### 3. Get Questions
- **`GET /api/feedback/questions`**
Returns the 4 standard central questions.

### 4. Submit Answers
- **`POST /api/feedback/{feedback_id}/answers`**
- **Request Body**:
```json
{
  "answers": [
    {
      "question_id": 1,
      "transcript": "The premises were very clean, though washrooms need more frequent sanitization."
    },
    {
      "question_id": 2,
      "transcript": "Staff was polite and medicine was administered on time."
    },
    {
      "question_id": 3,
      "transcript": "Doctors were thorough and explained my treatment clearly."
    },
    {
      "question_id": 4,
      "transcript": "I appreciated Sister Priya. Please add digital tokens in pharmacy."
    }
  ]
}
```

### 5. AI Feedback Analysis & Report Generation
- **`POST /api/feedback/{feedback_id}/analyze`**
Analyzes feedback via Groq AI, computes weighted scores, persists to `reports` collection, and returns complete report data.

### 6. Get Report
- **`GET /api/reports/{feedback_id}`**
Retrieves the saved report for rendering on the `/report` page.

---

## 📊 Hospital Scoring Weights

The overall hospital score is calculated through a weighted composite formula:

| Category | Weight |
|---|---|
| Cleanliness & Facilities | 20% |
| Staff Behaviour | 20% |
| Medicine Timeliness | 15% |
| Doctor Treatment & Service | 25% |
| Overall Service | 20% |

**Score Status Categories**:
- **90–100**: `Excellent`
- **75–89**: `Good`
- **60–74**: `Needs Improvement`
- **Below 60**: `Poor`

---

## 🧪 Running Unit Tests

Execute the automated test suite with pytest:

```bash
pytest -v
```

All tests mock external AI calls to run with zero network dependencies.

---

## 🔒 Privacy-First Design

CareVoice is designed for patient confidentiality:
- **No personally identifiable information (PII)** is collected or stored (no names, phone numbers, emails, addresses, or Aadhaar).
- Submissions are referenced solely through anonymous IDs (`CV + date + digits`).
- Sensitive patient responses are not logged to console output.
