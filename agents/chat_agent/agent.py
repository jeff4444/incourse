from dataclasses import dataclass
from typing import List
from pydantic import BaseModel, Field
from pydantic_ai import Agent, Tool
from shared.prompts.chat_agent_prompt import CHAT_AGENT_PROMPT
from shared.agents.pinecone_tools import search_file_with_query
from shared.agents.model import get_model


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
    course_id: str
    file_ids: List[str]


SYSTEM_PROMPT = CHAT_AGENT_PROMPT


def get_chat_agent(**kwargs) -> Agent[Deps, ChatAnswer]:
    """
    Create a lightweight chat agent for file Q&A in viewers.
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


