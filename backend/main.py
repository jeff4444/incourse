import os
import asyncio
from typing import List, Dict, Optional
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Import all agents
from agents.flashcard_gen_agent.agent import get_flashcard_agent, Flashcard, Deps as FlashcardDeps
from agents.quiz_gen_agent.agent import get_quiz_agent, Quiz, Deps as QuizDeps
from agents.nudge_agent.agent import get_nudge_agent, Nudge, Deps as NudgeDeps
from agents.take_action_agent.agent import get_take_action_agent, RouteOutput, Deps as TakeActionDeps

load_dotenv()

app = FastAPI(
    title="InCourse AI Agents API",
    description="Backend API for InCourse AI agents including flashcard generation, quiz generation, nudges, and action routing",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response Models
class FlashcardRequest(BaseModel):
    user_id: str
    course_id: str
    file_ids: List[str]
    num_flashcards: int = 10
    prompt: Optional[str] = None

class QuizRequest(BaseModel):
    user_id: str
    course_id: str
    file_ids: List[str]
    num_quizzes: int = 10
    prompt: Optional[str] = None

class NudgeRequest(BaseModel):
    user_id: str
    prompt: Optional[str] = None

class TakeActionRequest(BaseModel):
    user_id: str
    user_input: str

class FlashcardResponse(BaseModel):
    flashcards: List[Dict[str, str]]
    success: bool
    message: str

class QuizResponse(BaseModel):
    quizzes: List[Dict[str, str]]
    success: bool
    message: str

class NudgeResponse(BaseModel):
    nudges: List[Dict[str, str]]
    success: bool
    message: str

class TakeActionResponse(BaseModel):
    route_to: str
    file_to_open: str
    quiz_or_flashcard_to_open: str
    quiz_or_flashcard_to_create: str
    course_id: str
    success: bool
    message: str
    
    
def get_user_lms_api_key(user_id: str) -> str:
    """
    Get the LMS API key for the user.
    """
    return os.getenv("CANVAS_API_TOKEN")

# Health check endpoint
@app.get("/")
async def root():
    return {"message": "InCourse AI Agents API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "All agents are ready"}

# Flashcard Generation Endpoint
@app.post("/generate-flashcards", response_model=FlashcardResponse)
async def generate_flashcards(request: FlashcardRequest):
    """
    Generate flashcards based on course content and files.
    """
    try:
        # Create dependencies
        api_key = get_user_lms_api_key(request.user_id)
        
        deps = FlashcardDeps(
            user_id=request.user_id,
            course_id=request.course_id,
            file_ids=request.file_ids,
            lms_api_key=api_key
        )
        
        # Get the flashcard agent
        agent = get_flashcard_agent(num_flashcards=request.num_flashcards)
        
        # Generate flashcards
        prompt = f"Generate {request.num_flashcards} flashcards. Additional instructions: {request.prompt}"
        flashcards = await agent.run(prompt, deps=deps)
        
        # Convert to dictionary format
        flashcard_dicts = [flashcard.to_dict() for flashcard in flashcards.output]
        
        return FlashcardResponse(
            flashcards=flashcard_dicts,
            success=True,
            message="Flashcards generated successfully"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating flashcards: {str(e)}")

# Quiz Generation Endpoint
@app.post("/generate-quiz", response_model=QuizResponse)
async def generate_quiz(request: QuizRequest):
    """
    Generate quiz questions based on course content and files.
    """
    try:
        # Create dependencies
        api_key = get_user_lms_api_key(request.user_id)
        
        deps = QuizDeps(
            user_id=request.user_id,
            course_id=request.course_id,
            file_ids=request.file_ids,
            lms_api_key=api_key
        )
        
        # Get the quiz agent
        agent = get_quiz_agent(num_quizzes=request.num_quizzes)
        
        # Generate quiz questions
        quizzes = await agent.run(request.prompt, deps=deps)
        
        # Convert to dictionary format
        quiz_dicts = [quiz.to_dict() for quiz in quizzes.output]
        
        return QuizResponse(
            quizzes=quiz_dicts,
            success=True,
            message="Quiz questions generated successfully"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating quiz: {str(e)}")

# Nudge Generation Endpoint
@app.post("/generate-nudges", response_model=NudgeResponse)
async def generate_nudges(request: NudgeRequest):
    """
    Generate personalized nudges for the user.
    """
    try:
        # Create dependencies
        api_key = get_user_lms_api_key(request.user_id)
        
        deps = NudgeDeps(
            user_id=request.user_id,
            lms_api_key=api_key
        )
        
        # Get the nudge agent
        agent = get_nudge_agent()
        
        # Generate nudges
        nudges = await agent.run(request.prompt or "Generate a nudge", deps=deps)
        
        # Convert to dictionary format
        nudge_dicts = [nudge.to_dict() for nudge in nudges.output]
        
        return NudgeResponse(
            nudges=nudge_dicts,
            success=True,
            message="Nudges generated successfully"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating nudges: {str(e)}")

# Take Action Endpoint
@app.post("/take-action", response_model=TakeActionResponse)
async def take_action(request: TakeActionRequest):
    """
    Process user input and determine the appropriate action to take.
    """
    try:
        # Create dependencies
        api_key = get_user_lms_api_key(request.user_id)
        
        deps = TakeActionDeps(
            user_id=request.user_id,
            lms_api_key=api_key
        )
        
        # Get the take action agent
        agent = get_take_action_agent()
        
        # Process the action    
        result = await agent.run(request.user_input, deps=deps)
        
        return TakeActionResponse(
            route_to=result.output.route_to,
            file_to_open=result.output.file_to_open,
            quiz_or_flashcard_to_open=result.output.quiz_or_flashcard_to_open,
            quiz_or_flashcard_to_create=result.output.quiz_or_flashcard_to_create,
            course_id=result.output.course_id,
            success=True,
            message="Action processed successfully"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing action: {str(e)}")

# Agent Status Endpoint
@app.get("/agents/status")
async def get_agents_status():
    """
    Get the status of all agents.
    """
    return {
        "flashcard_agent": "ready",
        "quiz_agent": "ready", 
        "nudge_agent": "ready",
        "take_action_agent": "ready"
    }

if __name__ == "__main__":
    import uvicorn
    
    # Get port from environment or default to 8000
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    print(f"Starting InCourse AI Agents API on {host}:{port}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,  # Enable auto-reload for development
        log_level="info"
    ) 