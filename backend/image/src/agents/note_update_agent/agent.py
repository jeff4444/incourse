from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field
from pydantic_ai import Agent, Tool
from prompts.note_update_agent_prompt import NOTE_UPDATE_AGENT_PROMPT
from tools.note_update_tools import (
    convert_markdown_to_tiptap,
    append_content_to_note,
    validate_tiptap_format
)
from shared.model import get_model


class NoteUpdate(BaseModel):
    """
    Model for note update output with formatted content.
    """
    formatted_content: str = Field(
        ...,
        description="The AI message formatted as markdown with proper structure, headers, and source attribution"
    )
    should_expand: bool = Field(
        ...,
        description="Whether the agent decided to expand the original message with additional details"
    )
    expansion_reason: Optional[str] = Field(
        default=None,
        description="Explanation of why the message was or wasn't expanded"
    )


@dataclass
class Deps:
    user_id: str
    course_id: str
    file_id: str
    ai_message: str
    conversation_context: List[Dict[str, str]]
    note_ids: List[str]
    
    # Lazy-loaded fields
    file_info: Optional[Dict[str, Any]] = None
    course_info: Optional[Dict[str, Any]] = None


SYSTEM_PROMPT = NOTE_UPDATE_AGENT_PROMPT


def get_note_update_agent(**kwargs) -> Agent[Deps, NoteUpdate]:
    """
    Create a note update agent for formatting AI chat messages for note insertion.
    The agent analyzes message complexity and intelligently formats content for Tiptap rendering.
    """
    model = get_model()

    return Agent[
        Deps,
        NoteUpdate,
    ](
        model,
        output_type=NoteUpdate,
        system_prompt=SYSTEM_PROMPT,
        tools=[
            Tool(convert_markdown_to_tiptap, takes_ctx=False),
            Tool(append_content_to_note, takes_ctx=False),
            Tool(validate_tiptap_format, takes_ctx=False),
        ],
        retries=2,
        output_retries=2,
    )
