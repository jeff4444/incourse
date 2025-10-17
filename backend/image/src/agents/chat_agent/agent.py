from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from pydantic_ai import Agent, Tool
from prompts.chat_agent_prompt import CHAT_AGENT_PROMPT
from tools.pinecone_tools import search_file_with_query, search_file_with_chunk_index
from tools.supabase_tools import get_course_and_file_info, get_chat_context
from shared.model import get_model
from shared.managers import ChatSessionManager


class ChatAnswer(BaseModel):
    """
    Model for a single chat answer.
    """
    answer: str = Field(..., description="Assistant's reply text")


@dataclass
class Deps:
    user_id: str
    course_id: str  # Internal course ID (not LMS ID)
    file_id: str  # The file/module_item ID
    session_id: Optional[str] = None  # Existing chat session ID
    
    # Lazy-loaded fields (fetched by agent tools when needed)
    lms_api_key: Optional[str] = None
    lms_base_url: Optional[str] = None
    course_info: Optional[Dict[str, Any]] = None
    file_info: Optional[Dict[str, Any]] = None
    is_file_from_lms: Optional[bool] = None
    chat_id: Optional[str] = None
    chat_history: Optional[List[Dict[str, Any]]] = None
    context_summary: Optional[str] = None

SYSTEM_PROMPT = CHAT_AGENT_PROMPT


def get_chat_agent(**kwargs) -> Agent[Deps, ChatAnswer]:
    """
    Create a chat agent for file Q&A with history and context support.
    The agent can intelligently fetch context only when needed.
    """
    model = get_model()

    return Agent[
        Deps,
        ChatAnswer,
    ](
        model,
        output_type=ChatAnswer,
        system_prompt=SYSTEM_PROMPT,
        tools=[
            Tool(get_course_and_file_info, takes_ctx=True),
            Tool(get_chat_context, takes_ctx=True),
            Tool(search_file_with_query, takes_ctx=True),
            Tool(search_file_with_chunk_index, takes_ctx=True),
        ],
        retries=3,
        output_retries=3,
    )

