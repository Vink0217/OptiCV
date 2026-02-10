# OptiCV 🚀

**OptiCV** is an advanced AI-powered resume optimization platform designed to help job seekers bypass Applicant Tracking Systems (ATS). By leveraging Google's **Gemini 2.5 Flash** model, OptiCV parses, analyzes, scores, and rewrites resumes to perfectly align with specific job descriptions.

![OptiCV Dashboard]([https://via.placeholder.com/800x400?text=OptiCV+Dashboard+Preview](https://opti-cv-proj.vercel.app/))

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
