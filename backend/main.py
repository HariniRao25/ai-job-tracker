
import os

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from supabase import create_client
from dotenv import load_dotenv
from groq import Groq


# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")


# Check credentials
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Supabase credentials are missing from .env")

if not SUPABASE_PUBLISHABLE_KEY:
    raise RuntimeError("Supabase publishable key is missing from .env")

if not GROQ_API_KEY:
    raise RuntimeError("Groq API key is missing from .env")


# Supabase client used to verify login tokens
auth_verifier = create_client(SUPABASE_URL, SUPABASE_KEY)

# Groq AI client
groq_client = Groq(api_key=GROQ_API_KEY)


# Create FastAPI application
app = FastAPI(title="CareerTrack API")


# Frontend connection settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://localhost:5178",
        "http://localhost:5179",
        "https://ai-job-tracker-gold-seven.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Authentication
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    try:
        response = auth_verifier.auth.get_user(token)

        if not response.user:
            raise HTTPException(
                status_code=401,
                detail="Invalid login session"
            )

        return {
            "id": str(response.user.id),
            "email": response.user.email
        }

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired login token"
        )


# Create a database client for the logged-in user
def get_user_supabase(token: str):
    client = create_client(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    )

    # Forward the user's JWT so database RLS policies apply
    client.postgrest.auth(token)

    return client


# Request models
class JobApplication(BaseModel):
    company: str
    role: str
    date: str
    status: str


class ResumeAnalysisRequest(BaseModel):
    resume_text: str
    job_description: str


class InterviewRequest(BaseModel):
    job_role: str
    job_description: str


# Home endpoint (public)
@app.get("/")
def home():
    return {
        "message": "CareerTrack API is running!"
    }


# Get applications belonging to the logged-in user
@app.get("/applications")
def get_applications(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: dict = Depends(get_current_user)
):
    try:
        client = get_user_supabase(credentials.credentials)

        response = (
            client.table("applications")
            .select("*")
            .eq("user_id", current_user["id"])
            .order("id")
            .execute()
        )

        return response.data

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Could not fetch applications"
        )


# Add an application for the logged-in user
@app.post("/applications")
def add_application(
    application: JobApplication,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: dict = Depends(get_current_user)
):
    try:
        client = get_user_supabase(credentials.credentials)

        application_data = application.model_dump()
        application_data["user_id"] = current_user["id"]

        response = (
            client.table("applications")
            .insert(application_data)
            .execute()
        )

        return {
            "message": "Application added successfully",
            "application": response.data[0]
        }

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Could not add application"
        )


# Update only the logged-in user's application
@app.put("/applications/{application_id}")
def update_application(
    application_id: int,
    updated_application: JobApplication,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: dict = Depends(get_current_user)
):
    try:
        client = get_user_supabase(credentials.credentials)

        response = (
            client.table("applications")
            .update(updated_application.model_dump())
            .eq("id", application_id)
            .eq("user_id", current_user["id"])
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=404,
                detail="Application not found"
            )

        return {
            "message": "Application updated successfully",
            "application": response.data[0]
        }

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Could not update application"
        )


# Delete only the logged-in user's application
@app.delete("/applications/{application_id}")
def delete_application(
    application_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: dict = Depends(get_current_user)
):
    try:
        client = get_user_supabase(credentials.credentials)

        response = (
            client.table("applications")
            .delete()
            .eq("id", application_id)
            .eq("user_id", current_user["id"])
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=404,
                detail="Application not found"
            )

        return {
            "message": "Application deleted successfully"
        }

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Could not delete application"
        )


# Test Groq AI connection (login required)
@app.get("/test-ai")
def test_ai(
    current_user: dict = Depends(get_current_user)
):
    try:
        response = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": "Say: CareerTrack AI is working successfully!"
                }
            ],
            model="openai/gpt-oss-120b"
        )

        return {
            "message": response.choices[0].message.content
        }

    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Groq API error"
        )


# AI Resume Analysis (login required)
@app.post("/analyze-resume")
def analyze_resume(
    request: ResumeAnalysisRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        prompt = f"""
You are an expert resume analyzer.

Analyze the resume against the job description.

RESUME:
{request.resume_text}

JOB DESCRIPTION:
{request.job_description}

Provide:

1. Matching skills
2. Missing skills
3. Resume strengths
4. Areas for improvement
5. Overall match percentage

Use clear Markdown formatting with headings and bullet points.

Give honest, beginner-friendly feedback.
Do not invent skills, qualifications or experience.
The match percentage must be an estimate based only on the
information provided.
"""

        response = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model="openai/gpt-oss-120b",
            temperature=0.2,
            max_tokens=1200
        )

        return {
            "analysis": response.choices[0].message.content
        }

    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Resume analysis failed"
        )


# AI Interview Question Generator (login required)
@app.post("/generate-interview-questions")
def generate_interview_questions(
    request: InterviewRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        prompt = f"""
You are an experienced technical interviewer.

Generate interview preparation questions for this role.

JOB ROLE:
{request.job_role}

JOB DESCRIPTION:
{request.job_description}

Generate:

1. Five technical questions with suggested answers.
2. Three practical coding or problem-solving questions.
3. Two HR or behavioral questions with suggested answers.

Use clear Markdown formatting:
- Headings
- Numbered lists
- Tables where useful
- Code blocks for programming examples

Keep answers beginner-friendly, clear and accurate.
Do not assume the candidate has experience that was not provided.
For coding questions, include correct and understandable solutions.
"""

        response = groq_client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model="openai/gpt-oss-120b",
            temperature=0.3,
            max_tokens=2000
        )

        return {
            "job_role": request.job_role,
            "interview_questions": response.choices[0].message.content
        }

    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Interview generation failed"
        )
