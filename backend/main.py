import os
import asyncio
import base64
import hashlib
import tempfile
import subprocess
import aiohttp
from pathlib import Path
from typing import List, Dict, Optional
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
from agents.chat_agent.agent import get_chat_agent, ChatAnswer, Deps as ChatDeps, ChatSessionManager

from shared.agents.supabase_tools import get_user_api_keys, get_module_items_by_course_id, get_course
from shared.agents.pinecone_tools import get_file_details

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
    
def decrypt_api_key(encrypted_api_key: str) -> str:
    """
    Decrypt the API key using AES decryption compatible with CryptoJS.
    """
    try:
        # Get encryption key from environment
        encryption_key = os.getenv("NEXT_PUBLIC_ENCRYPTION_KEY")
        
        # Decode from base64
        encrypted_bytes = base64.b64decode(encrypted_api_key)
        
        # Check for "Salted__" prefix
        if encrypted_bytes[:8] != b"Salted__":
            raise ValueError("Invalid encrypted data format")
        
        # Extract salt and ciphertext
        salt = encrypted_bytes[8:16]
        ciphertext = encrypted_bytes[16:]
        
        # Derive key and IV using MD5 (CryptoJS default)
        key_size = 32  # 256 bits
        iv_size = 16   # 128 bits
        derived = b""
        last_hash = b""
        
        while len(derived) < key_size + iv_size:
            last_hash = hashlib.md5(last_hash + encryption_key.encode('utf-8') + salt).digest()
            derived += last_hash
        
        key = derived[:key_size]
        iv = derived[key_size:key_size + iv_size]
        
        # Decrypt
        cipher = AES.new(key, AES.MODE_CBC, iv)
        decrypted_padded = cipher.decrypt(ciphertext)
        
        # Remove PKCS7 padding
        pad_len = decrypted_padded[-1]
        decrypted_text = decrypted_padded[:-pad_len].decode('utf-8')
        
        return decrypted_text
        
    except Exception as e:
        print(f"Error decrypting API key: {e}")
        raise Exception("Failed to decrypt API key")
    
async def get_user_lms_info(user_id: str) -> str:
    """
    Get the LMS API key for the user.
    """
    api_keys = await get_user_api_keys(user_id=user_id)
    api_key = api_keys[0]
    encrypted_api_key = api_key["encrypted_api_key"]
    api_base_url =f"{api_key["api_base_url"]}/api/v1"
    decrypted_api_key = decrypt_api_key(encrypted_api_key)
    return {
        "api_key": decrypted_api_key,
        "base_url": api_base_url
    }

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
        lms_info = await get_user_lms_info(request.user_id)
        
        deps = FlashcardDeps(
            user_id=request.user_id,
            course_id=request.course_id,
            file_ids=request.file_ids,
            lms_api_key=lms_info["api_key"],
            lms_base_url=lms_info["base_url"]
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
        lms_info = await get_user_lms_info(request.user_id)
        
        deps = QuizDeps(
            user_id=request.user_id,
            course_id=request.course_id,
            file_ids=request.file_ids,
            lms_api_key=lms_info["api_key"],
            lms_base_url=lms_info["base_url"]
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
    Supports chat history and session management.
    """
    try:
        lms_info = await get_user_lms_info(request.user_id)
        
        course_info = await get_course(course_id=request.course_id)
        
        try:
            file_info = await get_module_items_by_course_id(course_id=course_info["id"], lms_id=request.file_ids[0])
            is_file_from_lms = False
            document_id = file_info["id"]  # Use the module_item ID
        except Exception as e:
            file_info = await get_file_details(api_key=lms_info["api_key"], api_base_url=lms_info["base_url"], course_id=course_info["lms_id"], file_id=request.file_ids[0])
            is_file_from_lms = True
            # For LMS files, we'll use the file_id as document_id since we don't have a module_item
            document_id = request.file_ids[0]
        
        # Initialize session manager
        session_manager = ChatSessionManager(course_info=course_info, file_info=file_info)
        
        # Load chat context (session, history, summary)
        chat_context = await session_manager.load_chat_context(
            user_id=request.user_id,
            document_id=document_id,
            session_id=request.session_id
        )
        
        # Create dependencies with chat context
        deps = ChatDeps(
            user_id=request.user_id,
            lms_api_key=lms_info["api_key"],
            lms_base_url=lms_info["base_url"],
            course_info=course_info,
            file_info=file_info,
            is_file_from_lms=is_file_from_lms,
            chat_id=chat_context["chat_id"],
            chat_history=chat_context["chat_history"],
            context_summary=chat_context["context_summary"]
        )

        # Build context-aware prompt
        user_prompt = request.prompt or request.message
        
        # Add context summary to prompt if available
        if chat_context["context_summary"]:
            user_prompt = f"Previous conversation summary: {chat_context['context_summary']}\n\nCurrent question: {user_prompt}"
        
        # Add recent chat history to prompt (last 5 messages for context)
        if chat_context["chat_history"]:
            recent_history = chat_context["chat_history"][-5:]  # Last 5 messages
            history_text = ""
            for msg in recent_history:
                role = "User" if msg["sender"] == "user" else "Assistant"
                history_text += f"{role}: {msg['content']}\n"
            
            user_prompt = f"Recent conversation:\n{history_text}\n\nCurrent question: {user_prompt}"

        agent = get_chat_agent()
        result = await agent.run(user_prompt, deps=deps)
        
        # Add messages to buffer
        await session_manager.add_message_to_buffer(
            chat_id=chat_context["chat_id"],
            sender="user",
            content=request.message
        )
        
        await session_manager.add_message_to_buffer(
            chat_id=chat_context["chat_id"],
            sender="assistant",
            content=result.output.answer
        )
        
        # Check if we should create a summary
        await session_manager.check_and_create_summary(
            chat_id=chat_context["chat_id"],
            user_message=request.message,
            assistant_response=result.output.answer
        )
        
        # Flush any remaining messages in buffer
        await session_manager.flush_buffer(chat_id=chat_context["chat_id"])
        
        return ChatResponse(
            answer=result.output.answer,
            success=True,
            message="OK",
            session_id=chat_context["chat_id"]
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