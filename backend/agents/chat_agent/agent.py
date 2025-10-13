from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from pydantic_ai import Agent, Tool
from prompts.chat_agent_prompt import CHAT_AGENT_PROMPT
from tools.pinecone_tools import search_file_with_query
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
    lms_api_key: str
    lms_base_url: str
    course_info: Dict[str, Any]
    file_info: Dict[str, Any]
    is_file_from_lms: bool
    chat_id: Optional[str] = None
    chat_history: List[Dict[str, Any]] = field(default_factory=list)
    context_summary: Optional[str] = None

SYSTEM_PROMPT = CHAT_AGENT_PROMPT


def get_chat_agent(**kwargs) -> Agent[Deps, ChatAnswer]:
    """
    Create a chat agent for file Q&A with history and context support.
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
            Tool(search_file_with_query, takes_ctx=True),
        ],
        retries=3,
        output_retries=3,
    )


# Note: ChatSessionManager has been moved to shared.managers
# Import it from there: from shared.managers import ChatSessionManager

