import os
from dataclasses import dataclass
from typing import List
from pydantic import BaseModel, Field
from pydantic_ai import Agent, Tool
from pydantic_ai.models.bedrock import BedrockConverseModel
from pydantic_ai.providers.bedrock import BedrockProvider
from dotenv import load_dotenv
from shared.prompts.chat_agent_prompt import CHAT_AGENT_PROMPT

# Reuse existing tools for Canvas/content access
from shared.agents.tools import (
    get_canvas_course,
    get_canvas_files_details,
)

load_dotenv()

ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
DEFAULT_LOCATION = os.getenv("AWS_DEFAULT_REGION")
MODEL_ARN = os.getenv("AWS_MODEL_ARN")


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
    model = BedrockConverseModel(
        MODEL_ARN,
        provider=BedrockProvider(
            region_name=DEFAULT_LOCATION,
            aws_access_key_id=ACCESS_KEY,
            aws_secret_access_key=SECRET_KEY,
        ),
    )

    return Agent[
        Deps,
        ChatAnswer,
    ](
        model,
        output_type=ChatAnswer,
        system_prompt=SYSTEM_PROMPT,
        tools=[
            Tool(get_canvas_course, takes_ctx=True),
            Tool(get_canvas_files_details, takes_ctx=True),
        ],
    )


