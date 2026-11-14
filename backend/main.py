
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client
from dotenv import load_dotenv
from groq import Groq


# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")


# Check credentials
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Supabase credentials are missing from .env")

if not GROQ_API_KEY:
    raise RuntimeError("Groq API key is missing from .env")


# Initialize clients
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
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


# Home endpoint
@app.get("/")
def home():
    return {
        "message": "CareerTrack API is running!"
    }


# Get all applications
@app.get("/applications")
def get_applications():
    try:
        response = (
            supabase.table("applications")
            .select("*")
            .order("id")
            .execute()
        )

        return response.data

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not fetch applications: {str(error)}"
        )


# Add application
@app.post("/applications")
def add_application(application: JobApplication):
    try:
        response = (
            supabase.table("applications")
            .insert(application.model_dump())
            .execute()
        )

        return {
            "message": "Application added successfully",
            "application": response.data[0]
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not add application: {str(error)}"
        )


# Update application
@app.put("/applications/{application_id}")
def update_application(
    application_id: int,
    updated_application: JobApplication
):
    try:
        response = (
            supabase.table("applications")
            .update(updated_application.model_dump())
            .eq("id", application_id)
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

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not update application: {str(error)}"
        )


# Delete application
@app.delete("/applications/{application_id}")
def delete_application(application_id: int):
    try:
        response = (
            supabase.table("applications")
            .delete()
            .eq("id", application_id)
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

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not delete application: {str(error)}"
        )


# Test Groq AI connection
@app.get("/test-ai")
def test_ai():
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

    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"Groq API error: {str(error)}"
        )


# AI Resume Analysis
@app.post("/analyze-resume")
def analyze_resume(request: ResumeAnalysisRequest):
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

    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"Resume analysis failed: {str(error)}"
        )


# AI Interview Question Generator
@app.post("/generate-interview-questions")
def generate_interview_questions(request: InterviewRequest):
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

    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"Interview generation failed: {str(error)}"
        )
