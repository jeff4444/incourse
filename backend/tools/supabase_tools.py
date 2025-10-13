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
]
