import os
import asyncio
import base64
import hashlib
import tempfile
import subprocess
import aiohttp
from pathlib import Path
from typing import List, Dict, Optional, Any
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from Crypto.Cipher import AES

# Import all agents
from agents.flashcard_gen_agent.agent import get_flashcard_agent, Flashcard, Deps as FlashcardDeps
from agents.quiz_gen_agent.agent import get_quiz_agent, Quiz, Deps as QuizDeps
from agents.nudge_agent.agent import get_nudge_agent, Nudge, Deps as NudgeDeps
from agents.take_action_agent.agent import get_take_action_agent, RouteOutput, Deps as TakeActionDeps
from agents.chat_agent.agent import get_chat_agent, ChatAnswer, Deps as ChatDeps

# Import managers and tools
from shared.managers import ChatSessionManager
from tools.supabase_tools import get_user_api_keys, get_module_items_by_course_id
from api.canvas import get_course_details, get_file_details_with_content
from shared.utils.supabase_utils import decrypt_api_key
from api.supabase import (
    get_user_lms_info,
    get_course,
    create_flashcard_deck,
    create_flashcards,
    get_flashcard_deck,
    create_quiz,
    create_quiz_questions,
    get_quiz,
    create_activity
)


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
    name: str
    file_ids: List[str]
    num_flashcards: int = 10
    card_type: str = "term-definition"
    extra_context: Optional[str] = None

class QuizRequest(BaseModel):
    user_id: str
    course_id: str
    name: str
    file_ids: List[str]
    num_questions: int = 5
    difficulty: str = "medium"
    extra_context: Optional[str] = None

class NudgeRequest(BaseModel):
    user_id: str
    prompt: Optional[str] = None

class TakeActionRequest(BaseModel):
    user_id: str
    user_input: str

class FlashcardResponse(BaseModel):
    deck_id: str
    deck: Dict[str, Any]
    success: bool
    message: str

class QuizResponse(BaseModel):
    quiz_id: str
    quiz: Dict[str, Any]
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

class ChatRequest(BaseModel):
    user_id: str
    course_id: str
    file_ids: List[str]
    message: str
    prompt: Optional[str] = None
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    success: bool
    message: str
    session_id: str

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
    Generate flashcards based on course content and files, and store them in the database.
    """
    try:
        # Pre-load dependencies to avoid refetching on every tool call
        lms_info = await get_user_lms_info(request.user_id)
        course_info = await get_course(request.course_id)
        
        deps = FlashcardDeps(
            user_id=request.user_id,
            course_id=request.course_id,
            file_ids=request.file_ids,
            lms_api_key=lms_info["api_key"],
            lms_base_url=lms_info["base_url"],
            course_info=course_info
        )
        
        # Get the flashcard agent with file_ids injected
        agent = get_flashcard_agent(num_flashcards=request.num_flashcards, file_ids=request.file_ids)
        
        # Build prompt with extra context if provided
        prompt = f"Generate {request.num_flashcards} flashcards"
        if request.extra_context:
            prompt += f". Additional instructions: {request.extra_context}"
        
        # Generate flashcards
        flashcards_result = await agent.run(prompt, deps=deps)
        
        # Convert to dictionary format
        flashcard_dicts = [flashcard.to_dict() for flashcard in flashcards_result.output]
        
        # Create deck in database
        deck_id = await create_flashcard_deck(
            user_id=request.user_id,
            course_id=request.course_id,
            name=request.name,
            file_ids=request.file_ids,
            card_count=len(flashcard_dicts),
            extra_context=request.extra_context,
            card_type=request.card_type
        )
        
        # Store flashcards in database
        await create_flashcards(deck_id, flashcard_dicts)
        
        # Fetch complete deck with flashcards
        deck = await get_flashcard_deck(deck_id)
        
        # Log activity asynchronously (fire-and-forget)
        asyncio.create_task(
            create_activity(
                user_id=request.user_id,
                course_id=request.course_id,
                activity_type="flashcard_generation",
                activity_summary=f"Generated {len(flashcard_dicts)} flashcards for {request.name}",
                feedback="neutral",
                metadata={
                    "deck_id": deck_id,
                    "deck_name": request.name,
                    "card_count": len(flashcard_dicts),
                    "card_type": request.card_type
                }
            )
        )
        
        return FlashcardResponse(
            deck_id=deck_id,
            deck=deck,
            success=True,
            message="Flashcards generated and saved successfully"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating flashcards: {str(e)}")

# Quiz Generation Endpoint
@app.post("/generate-quiz", response_model=QuizResponse)
async def generate_quiz(request: QuizRequest):
    """
    Generate quiz questions based on course content and files, and store them in the database.
    """
    try:
        # Pre-load dependencies to avoid refetching on every tool call
        lms_info = await get_user_lms_info(request.user_id)
        course_info = await get_course(request.course_id)
        
        deps = QuizDeps(
            user_id=request.user_id,
            course_id=request.course_id,
            file_ids=request.file_ids,
            lms_api_key=lms_info["api_key"],
            lms_base_url=lms_info["base_url"],
            course_info=course_info
        )
        
        # Get the quiz agent with file_ids injected
        agent = get_quiz_agent(num_quizzes=request.num_questions, difficulty=request.difficulty, file_ids=request.file_ids)
        
        # Build prompt with difficulty and extra context
        prompt = f"Generate {request.num_questions} {request.difficulty} difficulty quiz questions"
        if request.extra_context:
            prompt += f". Additional instructions: {request.extra_context}"
        
        # Generate quiz questions
        quizzes_result = await agent.run(prompt, deps=deps)
        
        # Convert to dictionary format
        quiz_dicts = [quiz.to_dict() for quiz in quizzes_result.output]
        
        # Create quiz in database
        quiz_id = await create_quiz(
            user_id=request.user_id,
            course_id=request.course_id,
            name=request.name,
            file_ids=request.file_ids,
            question_count=len(quiz_dicts),
            extra_context=request.extra_context,
            difficulty=request.difficulty
        )
        
        # Store quiz questions in database
        await create_quiz_questions(quiz_id, quiz_dicts)
        
        # Fetch complete quiz with questions
        quiz = await get_quiz(quiz_id)
        
        # Log activity asynchronously (fire-and-forget)
        asyncio.create_task(
            create_activity(
                user_id=request.user_id,
                course_id=request.course_id,
                activity_type="quiz_generation",
                activity_summary=f"Generated {request.difficulty.capitalize()} Quiz: {request.name}",
                feedback="neutral",
                metadata={
                    "quiz_id": quiz_id,
                    "quiz_name": request.name,
                    "question_count": len(quiz_dicts),
                    "difficulty": request.difficulty
                }
            )
        )
        
        return QuizResponse(
            quiz_id=quiz_id,
            quiz=quiz,
            success=True,
            message="Quiz generated and saved successfully"
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
        lms_info = await get_user_lms_info(request.user_id)
        
        deps = NudgeDeps(
            user_id=request.user_id,
            lms_api_key=lms_info["api_key"],
            lms_base_url=lms_info["base_url"]
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
        lms_info = await get_user_lms_info(request.user_id)
        
        deps = TakeActionDeps(
            user_id=request.user_id,
            lms_api_key=lms_info["api_key"],
            lms_base_url=lms_info["base_url"]
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

# Chat Agent Endpoint
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat with an AI assistant in the context of a course and selected files.
    The agent intelligently fetches context only when needed, making simple
    queries like "hi" much faster.
    """
    try:
        # Create minimal dependencies - agent will fetch what it needs
        deps = ChatDeps(
            user_id=request.user_id,
            course_id=request.course_id,
            file_id=request.file_ids[0],
            session_id=request.session_id
        )

        # Let the agent handle the query - it will fetch context as needed
        user_prompt = request.prompt or request.message
        agent = get_chat_agent()
        result = await agent.run(user_prompt, deps=deps)
        
        # Always do session management - we need to save all messages
        # However, we minimize API calls by reusing data the agent already fetched
        
        # 1. Ensure we have a chat_id
        if not deps.chat_id:
            from tools.supabase_tools import get_or_create_chat_session
            
            # Need document_id for chat session
            if not deps.file_info:
                # Try to get from Supabase first (cheapest call)
                try:
                    file_info = await get_module_items_by_course_id(
                        course_id=deps.course_id,
                        lms_id=request.file_ids[0]
                    )
                    document_id = file_info["id"]
                    deps.file_info = file_info
                    deps.is_file_from_lms = False
                except Exception:
                    # Fall back to using LMS file ID directly
                    document_id = request.file_ids[0]
                    deps.is_file_from_lms = True
            else:
                document_id = deps.file_info["id"] if not deps.is_file_from_lms else request.file_ids[0]
            
            chat_session = await get_or_create_chat_session(
                user_id=request.user_id,
                document_id=document_id
            )
            deps.chat_id = chat_session["id"]
        
        # 2. Ensure we have minimal info for session manager (lazy fetch only what's needed)
        if not deps.course_info:
            deps.course_info = await get_course(course_id=request.course_id)
        
        if not deps.file_info:
            # Try Supabase first (faster), then fallback to LMS
            try:
                deps.file_info = await get_module_items_by_course_id(
                    course_id=deps.course_info["id"],
                    lms_id=request.file_ids[0]
                )
                deps.is_file_from_lms = False
            except Exception:
                # Need LMS credentials
                if not deps.lms_api_key:
                    lms_info = await get_user_lms_info(request.user_id)
                    deps.lms_api_key = lms_info["api_key"]
                    deps.lms_base_url = lms_info["base_url"]
                
                deps.file_info = await get_file_details_with_content(
                    api_key=deps.lms_api_key,
                    api_base_url=deps.lms_base_url,
                    course_id=deps.course_info["lms_id"],
                    file_id=request.file_ids[0]
                )
                deps.is_file_from_lms = True
        
        # 3. Initialize session manager and save messages
        session_manager = ChatSessionManager(
            course_info=deps.course_info,
            file_info=deps.file_info
        )
        
        await session_manager.add_message_to_buffer(
            chat_id=deps.chat_id,
            sender="user",
            content=request.message
        )
        
        await session_manager.add_message_to_buffer(
            chat_id=deps.chat_id,
            sender="assistant",
            content=result.output.answer
        )
        
        # 4. Check if we should create a summary (reuse existing data from agent)
        await session_manager.check_and_create_summary(
            chat_id=deps.chat_id,
            user_message=request.message,
            assistant_response=result.output.answer,
            existing_chat_history=deps.chat_history,  # Reuse if agent fetched it
            existing_context_summary=deps.context_summary  # Reuse if agent fetched it
        )
        
        # 5. Flush any remaining messages in buffer
        await session_manager.flush_buffer(chat_id=deps.chat_id)
        
        session_id = deps.chat_id
        
        return ChatResponse(
            answer=result.output.answer,
            success=True,
            message="OK",
            session_id=session_id or request.session_id or ""
        )
    except Exception as e:
        import traceback
        print("=" * 80)
        print("ERROR IN /chat ENDPOINT:")
        print(traceback.format_exc())
        print("=" * 80)
        raise HTTPException(status_code=500, detail=f"Error chatting: {str(e)}")

# Office to PDF Conversion Endpoint
class ConvertOfficeRequest(BaseModel):
    url: str
    format: str  # pptx, xlsx, docx, ppt, xls, doc

@app.post("/convert-office-to-pdf")
async def convert_office_to_pdf(request: ConvertOfficeRequest):
    """
    Convert an Office file (PPTX, XLSX, DOCX, PPT, XLS, DOC) from a URL to PDF.
    Requires LibreOffice to be installed on the server.
    """
    temp_dir = None
    try:
        # Validate format
        supported_formats = ['pptx', 'ppt', 'xlsx', 'xls', 'docx', 'doc']
        file_format = request.format.lower().replace('.', '')
        
        if file_format not in supported_formats:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported format: {request.format}. Supported formats: {', '.join(supported_formats)}"
            )
        
        # Create temporary directory
        temp_dir = tempfile.mkdtemp()
        temp_path = Path(temp_dir)
        
        # Download the Office file
        input_path = temp_path / f"input.{file_format}"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(request.url) as response:
                if response.status != 200:
                    raise HTTPException(status_code=400, detail=f"Failed to download {file_format.upper()} file")
                
                content = await response.read()
                with open(input_path, 'wb') as f:
                    f.write(content)
        
        # Convert Office file to PDF using LibreOffice
        # Try different possible LibreOffice executable names
        libreoffice_commands = [
            'soffice',
            'libreoffice',
            '/Applications/LibreOffice.app/Contents/MacOS/soffice',  # macOS
            '/usr/bin/soffice',  # Linux
            'C:\\Program Files\\LibreOffice\\program\\soffice.exe',  # Windows
        ]
        
        conversion_successful = False
        error_messages = []
        
        for cmd in libreoffice_commands:
            try:
                # Run LibreOffice in headless mode to convert
                process = subprocess.run(
                    [
                        cmd,
                        '--headless',
                        '--convert-to', 'pdf',
                        '--outdir', str(temp_path),
                        str(input_path)
                    ],
                    capture_output=True,
                    text=True,
                    timeout=60  # 60 second timeout
                )
                
                if process.returncode == 0:
                    conversion_successful = True
                    break
                else:
                    error_messages.append(f"{cmd}: {process.stderr}")
                    
            except FileNotFoundError:
                error_messages.append(f"{cmd}: Not found")
                continue
            except subprocess.TimeoutExpired:
                error_messages.append(f"{cmd}: Conversion timeout")
                continue
            except Exception as e:
                error_messages.append(f"{cmd}: {str(e)}")
                continue
        
        if not conversion_successful:
            raise HTTPException(
                status_code=500, 
                detail=f"LibreOffice not found or conversion failed. Please ensure LibreOffice is installed. Errors: {'; '.join(error_messages)}"
            )
        
        # Find the converted PDF
        pdf_path = temp_path / "input.pdf"
        
        if not pdf_path.exists():
            raise HTTPException(status_code=500, detail="PDF conversion completed but output file not found")
        
        # Return the PDF file
        return FileResponse(
            path=str(pdf_path),
            media_type='application/pdf',
            filename='converted.pdf',
            background=None  # Don't delete immediately, we'll handle cleanup
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print("=" * 80)
        print("ERROR IN /convert-office-to-pdf ENDPOINT:")
        print(traceback.format_exc())
        print("=" * 80)
        raise HTTPException(status_code=500, detail=f"Error converting Office file to PDF: {str(e)}")
    finally:
        # Cleanup will happen after response is sent
        if temp_dir:
            # Schedule cleanup after a delay to ensure file is sent
            asyncio.create_task(cleanup_temp_dir(temp_dir))

async def cleanup_temp_dir(temp_dir: str):
    """Cleanup temporary directory after a delay"""
    await asyncio.sleep(5)  # Wait 5 seconds before cleanup
    try:
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)
    except Exception as e:
        print(f"Error cleaning up temp directory: {e}")

# Legacy endpoint for backward compatibility
@app.post("/convert-pptx-to-pdf")
async def convert_pptx_to_pdf_legacy(request: ConvertOfficeRequest):
    """
    Legacy endpoint for PPTX to PDF conversion.
    Use /convert-office-to-pdf instead.
    """
    request.format = 'pptx'
    return await convert_office_to_pdf(request)

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