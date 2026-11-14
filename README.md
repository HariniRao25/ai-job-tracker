# CareerTrack – AI-Powered Job Application Tracker

CareerTrack is a full-stack web application designed to help job seekers organize their job applications and prepare for interviews using AI.

It provides a centralized dashboard to track applications, analyze resumes against job descriptions, identify skill gaps, and generate interview questions.

## Features

- **Job Application Tracking:** Add, view, update, and delete job applications.
- **Resume Analysis:** Analyze resume content against a job description using AI.
- **Skill Gap Identification:** Identify skills that may need improvement.
- **Interview Preparation:** Generate relevant interview questions using AI.
- **Dashboard:** Manage job application details in one place.

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, Bootstrap |
| Backend | Python, FastAPI |
| Database | Supabase |
| AI Integration | Groq API |
| Version Control | Git, GitHub |

## Architecture

```text
User
  |
  v
React Frontend
  |
  v
FastAPI Backend
  |
  |------ Supabase Database
  |
  |------ Groq AI API
  |
  v
AI Analysis Results
  |
  v
React Frontend
```

## Project Structure

```text
ai-job-tracker/
├── backend/
│   ├── main.py
│   └── requirements.txt
├── database/
│   └── schema.sql
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
```

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/HariniRao25/ai-job-tracker.git
cd ai-job-tracker
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
```

Activate the virtual environment on Windows:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file inside the `backend` folder:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
GROQ_API_KEY=your_groq_api_key
```

Start the backend:

```bash
python -m uvicorn main:app --reload
```

Backend API:

`http://127.0.0.1:8000`

API documentation:

`http://127.0.0.1:8000/docs`

### 3. Database Setup

1. Open your Supabase project.
2. Navigate to the SQL Editor.
3. Execute the SQL script from `database/schema.sql`.
4. Configure your Supabase credentials in the backend `.env` file.

### 4. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite in your terminal.

## AI Capabilities

CareerTrack integrates the Groq API to provide:

- Resume and job description analysis.
- Skill gap identification.
- AI-generated interview questions.

## Future Enhancements

- User authentication and personalized dashboards.
- Resume file upload and text extraction.
- Job recommendation based on skills and experience.
- Application status analytics.
- Cloud deployment.

## Author

**Harini Jakinapelly**

GitHub: [HariniRao25](https://github.com/HariniRao25)

---

*CareerTrack is an AI-assisted job application management and interview preparation project. It does not automatically apply for jobs or guarantee job shortlisting.*