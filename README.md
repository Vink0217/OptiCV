# OptiCV — AI Resume Optimizer

OptiCV is an AI-powered resume optimization tool that parses PDF/DOCX resumes, scores them against a job description using a hybrid (algorithmic + AI) ATS engine, and generates ATS-friendly PDF/DOCX output. It preserves hyperlinks (LinkedIn, GitHub), enforces consistent date formatting, and provides section-level enhancements.
Demo video (Google Drive): https://drive.google.com/file/d/DRIVE_FILE_ID/view (replace DRIVE_FILE_ID with your file id)

Deployed to Vercel: frontend + backend are deployed. Production frontend URL (example): https://opti-cv-flame.vercel.app
Features
- AI parsing (PDF/DOCX) and structured extraction
- Hybrid ATS scoring (deterministic keyword/format checks + Gemini semantic scoring)
- AI-driven re-optimization and per-section enhancement
- ATS-friendly downloads (DOCX & PDF) with preserved hyperlinks

Tech stack
- Frontend: Next.js, TypeScript, Tailwind CSS, shadcn/ui
- Backend: FastAPI, Pydantic, google-genai (Gemini), pdfminer.six / pdfplumber (fallback)
Project layout
```
OptiCV/
├─ backend/         # FastAPI backend (src/, requirements.txt)
├─ frontend/        # Next.js frontend
├─ PROMPTS.md       # Gemini prompts and ATS logic
└─ README.md
```

Quick local setup
Backend (from project root):
```bash
cd backend
python -m venv venv
# Windows
venv\\Scripts\\activate
# macOS/Linux
# source venv/bin/activate
pip install -r requirements.txt
echo GEMINI_API_KEY=your_api_key_here > .env
uvicorn src.app:app --reload --port 8000
```

Frontend (new terminal):
```bash
cd frontend
npm install
npm run dev
```

Testing endpoints
- Parse (file upload): POST to `/api/parse` (multipart form field `file` + optional `job_description`)
- Optimize: POST to `/api/generate` with resume context + job description
- Score: POST to `/api/score` (file or text + JD)

Recording & deliverables
- Include a short demo walkthrough (6–9 minutes) showing upload → optimize → enhance → download.
- Add the Google Drive demo link above and include a short transcript under `demos/` in the repo.
- Include `PROMPTS.md` and `backend/src/models/prompts.py` so reviewers can inspect prompt rules and the ATS scoring rationale.
 - Include `PROMPTS.md` and `backend/src/models/prompts.py` so reviewers can inspect prompt rules and the ATS scoring rationale.

For a comprehensive, authoritative description of every Gemini prompt template, the non-negotiable instructions given to the model, and the hybrid ATS scoring methodology (weights, algorithmic checks, and AI-driven components), please refer to `PROMPTS.md` in this repository.

Contributing
- Open issues and pull requests are welcome. For local development follow the Quick local setup above.

License
- MIT

# OptiCV 🚀

**OptiCV** is an advanced AI-powered resume optimization platform designed to help job seekers bypass Applicant Tracking Systems (ATS). By leveraging Google's **Gemini 2.5 Flash** model, OptiCV parses, analyzes, scores, and rewrites resumes to perfectly align with specific job descriptions.


## ✨ Features

- **🔍 AI Resume Parsing**: Extracts structured data (skills, experience, education) from PDF and DOCX files using `pdfplumber` and `python-docx`.
- **📊 Hybrid ATS Scoring**: Combines algorithmic keyword matching with AI-driven semantic analysis to provide a realistic 0-100 ATS score.
- **✨ Intelligent Optimization**: Rewrites resume bullet points to naturally include job description keywords without "stuffing".
- **📝 Live Resume Editor**: Split-screen editor to fine-tune AI suggestions with real-time preview.
- **🎨 ATS-Friendly Downloads**: Generates clean, single-column PDF and DOCX files guaranteed to be parseable by ATS software.
- **💬 AI Career Coach**: Built-in chatbot to answer career questions and suggest improvements based on your specific resume context.
- **🔗 Hyperlink Preservation**: Intelligently preserves LinkedIn, GitHub, and Portfolio links during the optimization process.

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: Shadcn/UI + Lucide React
- **State Management**: React Hooks

### Backend
- **Framework**: FastAPI (Python 3.12+)
- **AI Model**: Google Gemini 2.5 Flash (`google-genai` SDK)
- **Parsing**: `pdfplumber`, `python-docx`
- **Generation**: `fpdf2` (PDF), `python-docx` (Word)
- **Validation**: Pydantic

## 📂 Project Structure

```bash
OptiCV/
├── backend/                 # FastAPI Python Backend
│   ├── src/
│   │   ├── app.py           # Entry point
│   │   ├── services/        # Logic (AI, Parsing, Scoring)
│   │   ├── routers/         # API Endpoints
│   │   └── models/          # Pydantic Schemas & Prompts
│   ├── requirements.txt     # Python Dependencies
│   └── .env                 # API Keys (GitIgnored)
│
├── frontend/                # Next.js Frontend
│   ├── src/
│   │   ├── app/             # App Router Pages
│   │   ├── components/      # UI Components
│   │   └── lib/             # API Utilities
│   ├── package.json         # Node Dependencies
│   └── vercel.json          # Deployment Config
│
├── PROMPTS.md               # Documentation of AI Prompts
└── README.md                # Project Documentation
```

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+** installed
- **Node.js 18+** installed
- A **Google Gemini API Key** (Get it free at [aistudio.google.com](https://aistudio.google.com/))

### 1. Backend Setup

Open a terminal in the `backend` folder:

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
echo GEMINI_API_KEY=your_actual_api_key_here > .env

# Start the server
uvicorn src.app:app --reload --port 8000
```
*The backend runs at `http://localhost:8000`*

### 2. Frontend Setup

Open a new terminal in the `frontend` folder:

```bash
cd frontend

# Install dependencies
npm install
# OR
# bun install

# Start the development server
npm run dev
```
*The frontend runs at `http://localhost:3000`*

## 🌐 Deployment (Vercel)

This project is optimized for deployment on Vercel as two separate projects (Frontend & Backend) linked via rewrites.

1.  **Deploy Backend**:
    *   Create a new Vercel project pointing to the `backend/` subdirectory.
    *   Set framework to **Other**.
    *   Add Environment Variable: `GEMINI_API_KEY`.
    *   *Copy the deployment URL (e.g., https://opticv-api.vercel.app)*

2.  **Deploy Frontend**:
    *   Create a new Vercel project pointing to the `frontend/` subdirectory.
    *   Set framework to **Next.js**.
    *   *Note: The `vercel.json` in frontend usually handles rewrites, but you may need to update the rewrite destination if cross-domain issues arise.*

## 📜 License

MIT License. Free to use and modify.
