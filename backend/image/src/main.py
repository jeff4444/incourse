import os
import asyncio
import base64
import hashlib
import tempfile
import subprocess
import aiohttp
import json
from pathlib import Path
from typing import List, Dict, Optional, Any
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field, validator
from dotenv import load_dotenv
# Import agent types (but not the actual agents - lazy loading)
from agents.flashcard_gen_agent.agent import Flashcard, Deps as FlashcardDeps
from agents.quiz_gen_agent.agent import Quiz, Deps as QuizDeps
from agents.nudge_agent.agent import Nudge, Deps as NudgeDeps
from agents.take_action_agent.agent import RouteOutput, Deps as TakeActionDeps
from agents.chat_agent.agent import ChatAnswer, Deps as ChatDeps
from agents.chat_agent.streaming_handler import stream_chat_agent
from agents.note_update_agent.agent import NoteUpdate, Deps as NoteUpdateDeps

# Import managers and tools
from shared.managers import ChatSessionManager
from tools.supabase_tools import get_module_items_by_course_id
from api.canvas import get_course_details
from api.supabase import (
    get_course,
    create_flashcard_deck,
    create_flashcards,
    get_flashcard_deck,
    create_quiz,
    create_quiz_questions,
    get_quiz,
    create_activity,
    create_autograder_feedback,
    get_file_details_with_content_from_db,
    get_file_details_with_temp_file_from_db
)


load_dotenv()

# Lazy loading functions to avoid importing heavy dependencies at startup
def get_flashcard_agent_lazy(**kwargs):
    from agents.flashcard_gen_agent.agent import get_flashcard_agent
    return get_flashcard_agent(**kwargs)

def get_quiz_agent_lazy(**kwargs):
    from agents.quiz_gen_agent.agent import get_quiz_agent
    return get_quiz_agent(**kwargs)

def get_nudge_agent_lazy(**kwargs):
    from agents.nudge_agent.agent import get_nudge_agent
    return get_nudge_agent(**kwargs)

def get_take_action_agent_lazy(**kwargs):
    from agents.take_action_agent.agent import get_take_action_agent
    return get_take_action_agent(**kwargs)

def get_chat_agent_lazy(**kwargs):
    from agents.chat_agent.agent import get_chat_agent
    return get_chat_agent(**kwargs)


def get_chat_agent_with_context_lazy(deps, provider="bedrock", **kwargs):
    from agents.chat_agent.agent import get_chat_agent_with_context
    return get_chat_agent_with_context(deps, provider=provider, **kwargs)

def get_note_update_agent_lazy(**kwargs):
    from agents.note_update_agent.agent import get_note_update_agent
    return get_note_update_agent(**kwargs)

async def save_partial_response(deps, request, partial_response):
    """
    Save partial response to database when client disconnects.
    Performs the same session management as normal completion but with partial content.
    """
    try:
        # 1. Ensure we have a chat_id
        if not deps.chat_id:
            from tools.supabase_tools import get_or_create_chat_session
            
            # Need document_id for chat session
            if not deps.file_info:
                try:
                    file_info = await get_module_items_by_course_id(
                        course_id=request.course_id,
                        lms_id=request.file_ids[0]
                    )
                    document_id = file_info["id"]
                    deps.file_info = file_info
                    deps.is_file_from_lms = False
                except Exception:
                    document_id = request.file_ids[0]
                    deps.is_file_from_lms = True
            else:
                document_id = deps.file_info["id"] if not deps.is_file_from_lms else request.file_ids[0]
            
            chat_session = await get_or_create_chat_session(
                user_id=request.user_id,
                document_id=document_id
            )
            deps.chat_id = chat_session["id"]
        
        # 2. Ensure we have minimal info for session manager
        if not deps.course_info:
            deps.course_info = await get_course(course_id=request.course_id)
        
        if not deps.file_info:
            deps.file_info = await get_file_details_with_content_from_db(
                file_id=request.file_ids[0],
                course_id=deps.course_info["id"]
            )
            deps.is_file_from_lms = False
        
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
            content=partial_response
        )
        
        # 4. Check if we should create a summary
        await session_manager.check_and_create_summary(
            chat_id=deps.chat_id,
            user_message=request.message,
            assistant_response=partial_response,
            existing_chat_history=deps.chat_history,
            existing_context_summary=deps.context_summary
        )
        
        # 5. Flush any remaining messages in buffer
        await session_manager.flush_buffer(chat_id=deps.chat_id)
        
        print(f"Partial response saved: {len(partial_response)} characters")
        
    except Exception as session_error:
        print(f"Error saving partial response: {session_error}")
        import traceback
        print(traceback.format_exc())

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
    file_ids: List[str] = Field(default=[], description="File IDs for generation")
    note_ids: List[str] = Field(default=[], description="Note IDs for generation")
    num_flashcards: int = 10
    card_type: str = "term-definition"
    extra_context: Optional[str] = None
    
    @validator('note_ids', always=True)
    def validate_content_sources(cls, v, values):
        file_ids = values.get('file_ids', [])
        note_ids = v or []
        
        # At least one source must be provided
        if not file_ids and not note_ids:
            raise ValueError('At least one file_id or note_id must be provided')
        
        return v

class QuizRequest(BaseModel):
    user_id: str
    course_id: str
    name: str
    file_ids: List[str] = Field(default=[], description="File IDs for generation")
    note_ids: List[str] = Field(default=[], description="Note IDs for generation")
    num_questions: int = 5
    difficulty: str = "medium"
    extra_context: Optional[str] = None
    
    @validator('note_ids', always=True)
    def validate_content_sources(cls, v, values):
        file_ids = values.get('file_ids', [])
        note_ids = v or []
        
        # At least one source must be provided
        if not file_ids and not note_ids:
            raise ValueError('At least one file_id or note_id must be provided')
        
        return v

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
    file_ids: List[str] = Field(..., min_length=1, description="At least one file ID must be provided")
    message: str
    prompt: Optional[str] = None
    session_id: Optional[str] = None
    provider: Optional[str] = "bedrock"
    
    @validator('provider')
    def validate_provider(cls, v):
        if v is not None and v not in ["bedrock", "openai"]:
            raise ValueError('Provider must be either "bedrock" or "openai"')
        return v

class ChatResponse(BaseModel):
    answer: str
    success: bool
    message: str
    session_id: str

class AddToNotesRequest(BaseModel):
    user_id: str
    course_id: str
    note_ids: List[str] = Field(..., min_length=1, description="At least one note ID must be provided")
    ai_message: str
    conversation_context: List[Dict[str, str]] = Field(default=[], description="Recent chat history for context")
    file_id: str = Field(..., description="Source file ID for attribution")

class AddToNotesResponse(BaseModel):
    success: bool
    updated_note_ids: List[str]
    message: str

# Health check endpoint
@app.get("/")
async def root():
    return {"message": "InCourse AI Agents API is running"}

@app.get("/health")
async def health_check():
    # Check that the environment variables are set
    if not os.getenv("AWS_DEFAULT_REGION"):
        return {"status": "unhealthy", "message": "AWS_DEFAULT_REGION is not set"}
    if not os.getenv("AWS_MODEL_ARN"):
        return {"status": "unhealthy", "message": "AWS_MODEL_ARN is not set"}
    if not os.getenv("AWS_ACCESS_KEY_ID"):
        return {"status": "unhealthy", "message": "AWS_ACCESS_KEY_ID is not set"}
    if not os.getenv("AWS_SECRET_ACCESS_KEY"):
        return {"status": "unhealthy", "message": "AWS_SECRET_ACCESS_KEY is not set"}
    if not os.getenv("PINECONE_API_KEY"):
        return {"status": "unhealthy", "message": "PINECONE_API_KEY is not set"}
    if not os.getenv("AWS_LAMBDA_FUNCTION_NAME") and not os.getenv("RUNNING_LOCALLY"):
        return {"status": "unhealthy", "message": "AWS_LAMBDA_FUNCTION_NAME is not set"}
    return {"status": "healthy", "message": "All agents are ready"}

# Flashcard Generation Endpoint
@app.post("/generate-flashcards", response_model=FlashcardResponse)
async def generate_flashcards(request: FlashcardRequest):
    """
    Generate flashcards based on course content and files, and store them in the database.
    """
    try:
        # Pre-load dependencies to avoid refetching on every tool call
        course_info = await get_course(request.course_id)
        
        deps = FlashcardDeps(
            user_id=request.user_id,
            course_id=request.course_id,
            file_ids=request.file_ids,
            course_info=course_info,
            note_ids=request.note_ids,
            notes_info=[]  # Will be fetched by tools if needed
        )
        
        # Get the flashcard agent with file_ids and note_ids injected
        agent = get_flashcard_agent_lazy(
            num_flashcards=request.num_flashcards, 
            file_ids=request.file_ids,
            note_ids=request.note_ids
        )
        
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
            card_type=request.card_type,
            note_ids=request.note_ids
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
        course_info = await get_course(request.course_id)
        
        deps = QuizDeps(
            user_id=request.user_id,
            course_id=request.course_id,
            file_ids=request.file_ids,
            course_info=course_info,
            note_ids=request.note_ids,
            notes_info=[]  # Will be fetched by tools if needed
        )
        
        # Get the quiz agent with file_ids and note_ids injected
        agent = get_quiz_agent_lazy(
            num_quizzes=request.num_questions, 
            difficulty=request.difficulty, 
            file_ids=request.file_ids,
            note_ids=request.note_ids
        )
        
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
            difficulty=request.difficulty,
            note_ids=request.note_ids
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
    Generate personalized nudges for the user and store them in the database.
    Only generates if no nudges exist or if last generation was 5+ hours ago.
    """
    try:
        from api import supabase as supabase_api
        
        # Check last nudge generation time
        last_generation = await supabase_api.get_last_nudge_generation_time(request.user_id)
        
        if last_generation:
            from datetime import datetime, timezone
            last_gen_time = datetime.fromisoformat(last_generation.replace('Z', '+00:00'))
            now = datetime.now(timezone.utc)
            hours_since_generation = (now - last_gen_time).total_seconds() / 3600
            
            if hours_since_generation < 5:
                return NudgeResponse(
                    nudges=[],
                    success=True,
                    message=f"Nudges generated recently, skipping generation. Next generation in {5 - hours_since_generation:.1f} hours."
                )
        
        deps = NudgeDeps(
            user_id=request.user_id,
        )
        
        # Get the nudge agent
        agent = get_nudge_agent_lazy()
        
        # Generate nudges
        nudges = await agent.run(request.prompt or "Generate personalized nudges based on user activity and deadlines", deps=deps)
        
        # Convert to dictionary format
        nudge_dicts = [nudge.to_dict() for nudge in nudges.output]
        
        # Store nudges in database (replaces old active nudges)
        await supabase_api.create_nudges(request.user_id, nudge_dicts)
        
        return NudgeResponse(
            nudges=[],  # Don't return nudges since they're stored in DB
            success=True,
            message="Nudges generated and stored successfully"
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
        deps = TakeActionDeps(
            user_id=request.user_id,
        )
        
        # Get the take action agent
        agent = get_take_action_agent_lazy()
        
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

        # Preload context (last 10 messages and summary) before agent runs
        await deps.preload_context()

        # Let the agent handle the query - it will fetch context as needed
        user_prompt = request.prompt or request.message
        agent = get_chat_agent_with_context_lazy(deps, provider=request.provider)
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
            # Query database for file info
            deps.file_info = await get_file_details_with_content_from_db(
                file_id=request.file_ids[0],
                course_id=deps.course_info["id"]
            )
            deps.is_file_from_lms = False
        
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

# Chat Agent Streaming Endpoint
@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    Stream chat responses with token-by-token generation and real-time tool call visibility.
    Uses pydantic-ai's native streaming capabilities with agent.iter() and node.stream().
    
    Returns Server-Sent Events (SSE) stream with:
    - text_delta: Token-by-token text generation
    - tool_call: Tool execution started
    - tool_result: Tool execution completed
    - done: Stream finished with full response
    """
    async def event_generator():
        full_response = ""
        try:
            # Create minimal dependencies - agent will fetch what it needs
            deps = ChatDeps(
                user_id=request.user_id,
                course_id=request.course_id,
                file_id=request.file_ids[0],
                session_id=request.session_id
            )
            
            # Preload context (last 10 messages and summary) before agent runs
            await deps.preload_context()
            
            # Build user prompt
            user_prompt = request.prompt or request.message
            
            # Get agent and stream response
            agent = get_chat_agent_with_context_lazy(deps, provider=request.provider)
            
            # Buffer to collect full response for session management
            full_response = ""
            
            try:
                async for event in stream_chat_agent(agent, user_prompt, deps):
                    # Send event to client
                    print("Sending event to client: ", event.to_sse())
                    yield event.to_sse()
                    
                    # Buffer text content for session management
                    if event.type.value == "text_delta":
                        full_response += event.content
                    elif event.type.value == "done" and event.content:
                        full_response = event.content
            except asyncio.CancelledError:
                # Client disconnected - save partial response
                print("Client disconnected, saving partial response")
                if full_response:
                    await save_partial_response(deps, request, full_response)
                raise
            except Exception as e:
                # Check if this is a client disconnect error
                if "client disconnected" in str(e).lower() or "connection closed" in str(e).lower():
                    print("Client disconnected, saving partial response")
                    if full_response:
                        await save_partial_response(deps, request, full_response)
                raise
            
            if full_response:
                # Save chat session directly in the main flow
                try:
                    # 1. Ensure we have a chat_id
                    if not deps.chat_id:
                        from tools.supabase_tools import get_or_create_chat_session
                        
                        # Need document_id for chat session
                        if not deps.file_info:
                            try:
                                file_info = await get_module_items_by_course_id(
                                    course_id=request.course_id,
                                    lms_id=request.file_ids[0]
                                )
                                document_id = file_info["id"]
                                deps.file_info = file_info
                                deps.is_file_from_lms = False
                            except Exception:
                                document_id = request.file_ids[0]
                                deps.is_file_from_lms = True
                        else:
                            document_id = deps.file_info["id"] if not deps.is_file_from_lms else request.file_ids[0]
                        
                        chat_session = await get_or_create_chat_session(
                            user_id=request.user_id,
                            document_id=document_id
                        )
                        deps.chat_id = chat_session["id"]
                    
                    # 2. Ensure we have minimal info for session manager
                    if not deps.course_info:
                        deps.course_info = await get_course(course_id=request.course_id)
                    
                    if not deps.file_info:
                        # Query database for file info
                        deps.file_info = await get_file_details_with_content_from_db(
                            file_id=request.file_ids[0],
                            course_id=deps.course_info["id"]
                        )
                        deps.is_file_from_lms = False
                    
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
                        content=full_response
                    )
                    
                    # 4. Check if we should create a summary
                    await session_manager.check_and_create_summary(
                        chat_id=deps.chat_id,
                        user_message=request.message,
                        assistant_response=full_response,
                        existing_chat_history=deps.chat_history,
                        existing_context_summary=deps.context_summary
                    )
                    
                    # 5. Flush any remaining messages in buffer
                    await session_manager.flush_buffer(chat_id=deps.chat_id)
                    
                except Exception as session_error:
                    print(f"Error in session management: {session_error}")
                    import traceback
                    print(traceback.format_exc())
        
        except Exception as e:
            import traceback
            print("=" * 80)
            print("ERROR IN /chat/stream ENDPOINT:")
            print(traceback.format_exc())
            print("=" * 80)
            
            # Send error event
            error_event = {
                "type": "error",
                "content": str(e)
            }
            yield f"data: {json.dumps(error_event)}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )

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


# Autograder Endpoint
class AutogradeResponse(BaseModel):
    feedback: str
    success: bool
    message: str


@app.post("/grade-assignment", response_model=AutogradeResponse)
async def grade_assignment(
    user_id: str = Form(...),
    course_id: str = Form(...),
    assignment_id: str = Form(...),
    files: List[UploadFile] = File(...)
):
    """
    Grade student assignment using AI assistant.
    
    Args:
        user_id: User ID
        course_id: Course ID
        assignment_id: Canvas assignment file ID
        files: List of solution files uploaded by student
    
    Returns:
        AI-generated feedback on the assignment
    """
    temp_file_paths = []
    openai_file_ids = []
    assistant_id = None
    
    try:
        # Import OpenAI functions
        from api.openai import (
            save_uploaded_files_to_temp,
            upload_file_to_openai,
            create_grading_assistant,
            run_grading_assistant,
            cleanup_openai_files,
            cleanup_openai_assistant,
            cleanup_temp_files
        )
        from prompts.autograder_prompt import AUTOGRADER_INSTRUCTIONS
        
        # Validate inputs
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")
        
        # Save uploaded files to temporary directory
        temp_file_paths = await save_uploaded_files_to_temp(files)
        
        # Get course info
        course_info = await get_course(course_id)
        
        # Download assignment file to temporary location (preserves original format)
        assignment_file_details, assignment_temp_path = await get_file_details_with_temp_file_from_db(
            file_id=assignment_id,
            course_id=course_id
        )
        temp_file_paths.append(assignment_temp_path)
        
        # Upload all files to OpenAI
        for temp_path in temp_file_paths:
            file_id = await upload_file_to_openai(temp_path)
            openai_file_ids.append(file_id)
        
        # Create grading assistant
        assistant_id = await create_grading_assistant(
            name=f"Autograder for {assignment_file_details.get('display_name', 'Assignment')}"
        )
        
        # Run grading
        feedback = await run_grading_assistant(
            assistant_id=assistant_id,
            file_ids=openai_file_ids,
            message=f"""
            Please analyze the attached assignment and student solution files.
            
            Assignment: {assignment_file_details.get('display_name', 'Unknown')}
            Student submitted {len(files)} file(s): {[f.filename for f in files]}
            
            Provide detailed feedback following the grading instructions.
            """
        )
        
        # Save feedback to database
        solution_file_names = [f.filename for f in files]
        await create_autograder_feedback(
            user_id=user_id,
            course_id=course_id,
            assignment_id=assignment_id,
            feedback_text=feedback,
            solution_file_names=solution_file_names
        )
        
        return AutogradeResponse(
            feedback=feedback,
            success=True,
            message="Assignment graded successfully"
        )
        
    except Exception as e:
        import traceback
        print("=" * 80)
        print("ERROR IN /grade-assignment ENDPOINT:")
        print(traceback.format_exc())
        print("=" * 80)
        raise HTTPException(status_code=500, detail=f"Error grading assignment: {str(e)}")
    
    finally:
        # Clean up temporary files, OpenAI files, and assistant
        try:
            from api.openai import cleanup_temp_files, cleanup_openai_files, cleanup_openai_assistant
            if temp_file_paths:
                await cleanup_temp_files(temp_file_paths)
            if openai_file_ids:
                await cleanup_openai_files(openai_file_ids)
            if assistant_id:
                await cleanup_openai_assistant(assistant_id)
        except Exception as cleanup_error:
            print(f"Warning: Error during cleanup: {cleanup_error}")


# Add Chat Message to Notes Endpoint
@app.post("/agents/notes/add-chat-message", response_model=AddToNotesResponse)
async def add_chat_message_to_notes(request: AddToNotesRequest):
    """
    Add an AI chat message to one or more notes with proper formatting and source attribution.
    The agent analyzes the message and intelligently formats it for note-taking.
    """
    try:
        from datetime import datetime
        from tools.note_update_tools import append_content_to_note
        
        # Create dependencies for the agent
        deps = NoteUpdateDeps(
            user_id=request.user_id,
            course_id=request.course_id,
            file_id=request.file_id,
            ai_message=request.ai_message,
            conversation_context=request.conversation_context,
            note_ids=request.note_ids
        )
        
        # Get the note update agent
        agent = get_note_update_agent_lazy()
        
        # Prepare the prompt with context
        context_str = ""
        if request.conversation_context:
            context_str = "\n\nConversation Context (most recent 5 messages):\n"
            for msg in request.conversation_context[-5:]:
                role = msg.get("role", "unknown")
                content = msg.get("content", "")
                context_str += f"{role}: {content[:200]}...\n" if len(content) > 200 else f"{role}: {content}\n"
        
        prompt = f"""
Please format the following AI chat message for insertion into course notes.

AI Message to Format:
{request.ai_message}
{context_str}

Source File ID: {request.file_id}
Course ID: {request.course_id}
Current Date: {datetime.now().strftime('%Y-%m-%d')}

Analyze the message, decide whether to expand it with additional context, format it properly with markdown, and include source attribution.
"""
        
        # Run the agent to get formatted content
        result = await agent.run(prompt, deps=deps)
        formatted_markdown = result.output.formatted_content
        
        # Update each note with the formatted content
        updated_note_ids = []
        for note_id in request.note_ids:
            try:
                await append_content_to_note(
                    note_id=note_id,
                    new_content_markdown=formatted_markdown,
                    source_file_id=request.file_id,
                    course_id=request.course_id
                )
                updated_note_ids.append(note_id)
            except Exception as note_error:
                print(f"Error updating note {note_id}: {str(note_error)}")
                # Continue with other notes even if one fails
        
        if not updated_note_ids:
            raise Exception("Failed to update any notes")
        
        return AddToNotesResponse(
            success=True,
            updated_note_ids=updated_note_ids,
            message=f"Successfully added content to {len(updated_note_ids)} note(s)"
        )
        
    except Exception as e:
        import traceback
        print("=" * 80)
        print("ERROR IN /agents/notes/add-chat-message ENDPOINT:")
        print(traceback.format_exc())
        print("=" * 80)
        raise HTTPException(status_code=500, detail=f"Error adding chat message to notes: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    
    # Get port from environment or default to 8000
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "127.0.0.1")
    
    print(f"Starting InCourse AI Agents API on {host}:{port}")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,  # Enable auto-reload for development
        log_level="info"
    ) 