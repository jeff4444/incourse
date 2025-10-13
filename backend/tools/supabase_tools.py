"""
Supabase tool wrappers that can work with or without RunContext.

For most functions, we simply re-export from the API module since they already
don't require RunContext. Some functions are wrapped to extract from context when available.
"""

from pydantic_ai import RunContext
from typing import List, Dict, Any, Optional

# Import and re-export all API functions
from api.supabase import (
    get_supabase_client,
    get_user,
    get_user_by_email,
    get_user_api_keys,
    get_courses,
    get_course,
    get_course_by_lms_id,
    get_user_enrollments,
    is_user_enrolled,
    get_course_modules,
    get_module,
    get_module_by_lms_id,
    get_module_items,
    get_module_item_by_lms_id,
    get_module_items_by_course_id,
    get_module_items_by_type,
    get_course_module_items,
    get_module_item,
    get_modules_with_items,
    get_course_with_modules,
    search_courses,
    get_or_create_chat_session,
    get_chat_messages,
    batch_save_messages,
    get_latest_context_snapshot,
    create_context_snapshot,
    get_chat_message_count,
)


async def get_course_and_file_info(ctx: RunContext) -> Dict[str, Any]:
    """
    Fetch course and file information. Only call this when you need specific
    details about the course or document being discussed.
    
    This will populate ctx.deps with:
    - course_info: Course details (name, code, etc.)
    - file_info: File/document details
    - lms_api_key, lms_base_url: LMS credentials for further API calls
    - is_file_from_lms: Whether the file is from LMS or our DB
    
    Returns:
        Dictionary with course_name, course_code, file_name, and file_type
    """
    from api.supabase import get_user_api_keys
    
    # Fetch LMS info if not already loaded
    if not ctx.deps.lms_api_key or not ctx.deps.lms_base_url:
        lms_info = await get_user_api_keys(user_id=ctx.deps.user_id)
        ctx.deps.lms_api_key = lms_info["api_key"]
        ctx.deps.lms_base_url = lms_info["base_url"]
    
    # Fetch course info if not already loaded
    if not ctx.deps.course_info:
        ctx.deps.course_info = await get_course(course_id=ctx.deps.course_id)
    
    # Fetch file info if not already loaded
    if not ctx.deps.file_info:
        try:
            # Try to get from our database first
            file_info = await get_module_items_by_course_id(
                course_id=ctx.deps.course_info["id"],
                lms_id=ctx.deps.file_id
            )
            ctx.deps.is_file_from_lms = False
            ctx.deps.file_info = file_info
        except Exception:
            # Fall back to LMS API
            from api.canvas import get_file_details
            file_info = await get_file_details(
                api_key=ctx.deps.lms_api_key,
                api_base_url=ctx.deps.lms_base_url,
                course_id=ctx.deps.course_info["lms_id"],
                file_id=ctx.deps.file_id
            )
            ctx.deps.is_file_from_lms = True
            ctx.deps.file_info = file_info
    
    # Return summary information
    return {
        "course_name": ctx.deps.course_info.get("name", "Unknown"),
        "course_code": ctx.deps.course_info.get("code", "Unknown"),
        "file_name": ctx.deps.file_info.get("name" if not ctx.deps.is_file_from_lms else "display_name", "Unknown"),
        "file_type": ctx.deps.file_info.get("type", "Unknown")
    }


async def get_chat_context(ctx: RunContext) -> Dict[str, Any]:
    """
    Fetch chat history and context summary. Only call this when the user's
    query requires previous conversation context (e.g., "how do I do that",
    "what did you say earlier", follow-up questions).
    
    This loads recent chat history and any existing conversation summary
    to help you understand what was discussed before.
    
    Returns:
        Dictionary with:
        - has_history: Whether there's any prior conversation
        - message_count: Number of messages in history
        - context_summary: Summary of previous conversation (if available)
        - recent_messages: Last 5 messages for immediate context
    """
    # Get or create chat session
    if not ctx.deps.chat_id:
        # Determine document_id for session lookup
        # Need to check if file_info is loaded to determine document_id
        if ctx.deps.file_info:
            # File info is loaded, check if it's from LMS
            if ctx.deps.is_file_from_lms:
                document_id = ctx.deps.file_id
            else:
                document_id = ctx.deps.file_info.get("id", ctx.deps.file_id)
        else:
            # File info not loaded yet, try to determine from DB first
            try:
                file_info = await get_module_items_by_course_id(
                    course_id=ctx.deps.course_id,
                    lms_id=ctx.deps.file_id
                )
                document_id = file_info["id"]
                ctx.deps.file_info = file_info
                ctx.deps.is_file_from_lms = False
            except Exception:
                # Not in our DB, so it's from LMS
                document_id = ctx.deps.file_id
                ctx.deps.is_file_from_lms = True
        
        if ctx.deps.session_id:
            ctx.deps.chat_id = ctx.deps.session_id
        else:
            chat_session = await get_or_create_chat_session(
                user_id=ctx.deps.user_id,
                document_id=document_id
            )
            ctx.deps.chat_id = chat_session["id"]
    
    # Load chat history if not already loaded
    if ctx.deps.chat_history is None:
        ctx.deps.chat_history = await get_chat_messages(chat_id=ctx.deps.chat_id, limit=20)
    
    # Load context summary if not already loaded
    if ctx.deps.context_summary is None:
        snapshot = await get_latest_context_snapshot(chat_id=ctx.deps.chat_id)
        ctx.deps.context_summary = snapshot["summary"] if snapshot else None
    
    # Format recent messages for the agent
    recent_messages = []
    for msg in ctx.deps.chat_history[-5:] if ctx.deps.chat_history else []:
        role = "User" if msg["sender"] == "user" else "Assistant"
        recent_messages.append({
            "role": role,
            "content": msg["content"]
        })
    
    return {
        "has_history": len(ctx.deps.chat_history) > 0,
        "message_count": len(ctx.deps.chat_history),
        "context_summary": ctx.deps.context_summary,
        "recent_messages": recent_messages
    }

__all__ = [
    'get_supabase_client',
    'get_user',
    'get_user_by_email',
    'get_user_api_keys',
    'get_courses',
    'get_course',
    'get_course_by_lms_id',
    'get_user_enrollments',
    'is_user_enrolled',
    'get_course_modules',
    'get_module',
    'get_module_by_lms_id',
    'get_module_items',
    'get_module_item_by_lms_id',
    'get_module_items_by_course_id',
    'get_module_items_by_type',
    'get_course_module_items',
    'get_module_item',
    'get_modules_with_items',
    'get_course_with_modules',
    'search_courses',
    'get_or_create_chat_session',
    'get_chat_messages',
    'batch_save_messages',
    'get_latest_context_snapshot',
    'create_context_snapshot',
    'get_chat_message_count',
    'get_course_and_file_info',
    'get_chat_context',
]
