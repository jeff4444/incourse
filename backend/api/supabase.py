"""
Core Supabase API functions without RunContext dependency.
All functions accept explicit parameters instead of extracting from context.
"""

import os
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from supabase import create_client, Client
from shared.utils.supabase_utils import decrypt_api_key

load_dotenv()


def get_supabase_client() -> Client:
    """
    Create and return a Supabase client instance.
    
    Returns:
        Initialized Supabase client
    
    Raises:
        ValueError: If required environment variables are not set
    """
    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    
    if not supabase_url:
        raise ValueError("Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL environment variable")
    
    if not supabase_key:
        raise ValueError("Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY environment variable")
    
    return create_client(supabase_url, supabase_key)


async def get_user(
    user_id: str
) -> Dict[str, Any]:
    """
    Get user information from Supabase.
    
    Args:
        user_id: User ID
    
    Returns:
        User data dictionary
    
    Raises:
        Exception: If user is not found or query fails
    """
    print(f"calling get_user with user_id={user_id}")
    
    supabase = get_supabase_client()
    
    response = supabase.table("users").select("*").eq("id", user_id).execute()
    
    if not response.data:
        raise Exception(f"User not found: {user_id}")
    
    return response.data[0]


async def get_user_by_email(
    email: str
) -> Dict[str, Any]:
    """
    Get user information by email from Supabase.
    
    Args:
        email: User email address
    
    Returns:
        User data dictionary
    
    Raises:
        Exception: If user is not found or query fails
    """
    print(f"calling get_user_by_email with email={email}")
    
    supabase = get_supabase_client()
    
    response = supabase.table("users").select("*").eq("email", email).execute()
    
    if not response.data:
        raise Exception(f"User not found with email: {email}")
    
    return response.data[0]
  
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
    
async def get_user_api_keys(
    user_id: str,
    lms_provider: Optional[str] = None,
    active_only: bool = True
) -> List[Dict[str, Any]]:
    """
    Get user API keys from Supabase.
    
    Args:
        user_id: User ID
        lms_provider: Optional filter by LMS provider (canvas, blackboard, moodle, d2l)
        active_only: If True, only return active API keys
    
    Returns:
        List of user API key dictionaries
    """
    print(f"calling get_user_api_keys with user_id={user_id}, lms_provider={lms_provider}, active_only={active_only}")
    
    supabase = get_supabase_client()
    
    query = supabase.table("user_api_keys").select("*").eq("user_id", user_id)
    
    if lms_provider:
        query = query.eq("lms_provider", lms_provider)
    
    if active_only:
        query = query.eq("is_active", True)
    
    response = query.execute()
    
    return response.data


async def get_courses(
    user_id: str,
    lms_provider: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Get all courses for a user from Supabase.
    
    Args:
        user_id: User ID
        lms_provider: Optional filter by LMS provider
    
    Returns:
        List of course dictionaries with enrollment information
    """
    print(f"calling get_courses with user_id={user_id}, lms_provider={lms_provider}")
    
    supabase = get_supabase_client()
    
    # Query enrollments with course data
    query = (
        supabase.table("enrollments")
        .select("*, courses(*)")
        .eq("user_id", user_id)
    )
    
    response = query.execute()
    
    # Extract course data and add enrollment info
    courses = []
    for enrollment in response.data:
        course = enrollment.get("courses", {})
        if course and (not lms_provider or course.get("lms_provider") == lms_provider):
            course["enrollment_id"] = enrollment.get("id")
            course["enrolled_at"] = enrollment.get("created_at")
            courses.append(course)
    
    return courses


async def get_course(
    course_id: str
) -> Dict[str, Any]:
    """
    Get a specific course from Supabase.
    
    Args:
        course_id: Course ID
    
    Returns:
        Course data dictionary
    
    Raises:
        Exception: If course is not found or query fails
    """
    print(f"calling get_course with course_id={course_id}")
    
    supabase = get_supabase_client()
    
    response = supabase.table("courses").select("*").eq("id", course_id).execute()
    
    if not response.data:
        raise Exception(f"Course not found: {course_id}")
    
    return response.data[0]


async def get_course_by_lms_id(
    lms_id: str,
    lms_provider: str
) -> Dict[str, Any]:
    """
    Get a course by its LMS ID and provider.
    
    Args:
        lms_id: LMS course ID
        lms_provider: LMS provider name (canvas, blackboard, etc.)
    
    Returns:
        Course data dictionary
    
    Raises:
        Exception: If course is not found or query fails
    """
    print(f"calling get_course_by_lms_id with lms_id={lms_id}, lms_provider={lms_provider}")
    
    supabase = get_supabase_client()
    
    response = (
        supabase.table("courses")
        .select("*")
        .eq("lms_id", lms_id)
        .eq("lms_provider", lms_provider)
        .execute()
    )
    
    if not response.data:
        raise Exception(f"Course not found with lms_id={lms_id}, lms_provider={lms_provider}")
    
    return response.data[0]


async def get_user_enrollments(
    user_id: str
) -> List[Dict[str, Any]]:
    """
    Get all enrollments for a user.
    
    Args:
        user_id: User ID
    
    Returns:
        List of enrollment dictionaries
    """
    print(f"calling get_user_enrollments with user_id={user_id}")
    
    supabase = get_supabase_client()
    
    response = (
        supabase.table("enrollments")
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )
    
    return response.data


async def is_user_enrolled(
    course_id: str,
    user_id: str
) -> bool:
    """
    Check if a user is enrolled in a course.
    
    Args:
        course_id: Course ID
        user_id: User ID
    
    Returns:
        True if enrolled, False otherwise
    """
    print(f"calling is_user_enrolled with user_id={user_id}, course_id={course_id}")
    
    supabase = get_supabase_client()
    
    response = (
        supabase.table("enrollments")
        .select("id")
        .eq("user_id", user_id)
        .eq("course_id", course_id)
        .execute()
    )
    
    return len(response.data) > 0


async def get_course_modules(
    course_id: str
) -> List[Dict[str, Any]]:
    """
    Get all modules for a course from Supabase.
    
    Args:
        course_id: Course ID
    
    Returns:
        List of module dictionaries
    """
    print(f"calling get_course_modules with course_id={course_id}")
    
    supabase = get_supabase_client()
    
    response = (
        supabase.table("modules")
        .select("*")
        .eq("course_id", course_id)
        .order("created_at")
        .execute()
    )
    
    return response.data


async def get_module(
    module_id: str
) -> Dict[str, Any]:
    """
    Get a specific module from Supabase.
    
    Args:
        module_id: Module ID
    
    Returns:
        Module data dictionary
    
    Raises:
        Exception: If module is not found or query fails
    """
    print(f"calling get_module with module_id={module_id}")
    
    supabase = get_supabase_client()
    
    response = supabase.table("modules").select("*").eq("id", module_id).execute()
    
    if not response.data:
        raise Exception(f"Module not found: {module_id}")
    
    return response.data[0]


async def get_module_by_lms_id(
    lms_id: str,
    course_id: str
) -> Dict[str, Any]:
    """
    Get a module by its LMS ID and course ID.
    
    Args:
        lms_id: LMS module ID
        course_id: Course ID
    
    Returns:
        Module data dictionary
    
    Raises:
        Exception: If module is not found or query fails
    """
    print(f"calling get_module_by_lms_id with lms_id={lms_id}, course_id={course_id}")
    
    supabase = get_supabase_client()
    
    response = (
        supabase.table("modules")
        .select("*")
        .eq("lms_id", lms_id)
        .eq("course_id", course_id)
        .execute()
    )
    
    if not response.data:
        raise Exception(f"Module not found with lms_id={lms_id}, course_id={course_id}")
    
    return response.data[0]


async def get_module_items(
    module_id: str
) -> List[Dict[str, Any]]:
    """
    Get all items for a module from Supabase.
    
    Args:
        module_id: Module ID
    
    Returns:
        List of module item dictionaries ordered by position
    """
    print(f"calling get_module_items with module_id={module_id}")
    
    supabase = get_supabase_client()
    
    response = (
        supabase.table("module_items")
        .select("*")
        .eq("module_id", module_id)
        .order("position")
        .execute()
    )
    
    return response.data


async def get_module_item_by_lms_id(
    lms_id: str,
    module_id: str
) -> Dict[str, Any]:
    """
    Get a module item by its LMS ID and module ID.
    
    Args:
        lms_id: LMS module item ID
        module_id: Module ID
    
    Returns:
        Module item data dictionary
    
    Raises:
        Exception: If module item is not found or query fails
    """
    print(f"calling get_module_item_by_lms_id with lms_id={lms_id}, module_id={module_id}")
    
    supabase = get_supabase_client()
    
    response = (
        supabase.table("module_items")
        .select("*")
        .eq("lms_id", lms_id)
        .eq("module_id", module_id)
        .execute()
    )
    
    return response.data[0]


async def get_module_items_by_course_id(
    course_id: str,
    lms_id: str
) -> Dict[str, Any]:
    """
    Get a module item by its LMS ID and course ID.
    
    Args:
        course_id: Course ID
        lms_id: LMS content ID
        
    Returns:
        Module item data dictionary
    """
    print(f"calling get_module_items_by_course_id with course_id={course_id} and lms_id={lms_id}")
    
    supabase = get_supabase_client()
    
    response = (
        supabase.table("module_items")
        .select("*")
        .eq("lms_content_id", lms_id)
        .eq("course_id", course_id)
        .execute()
    )
    if not response.data:
        raise Exception(f"Module item not found with lms_id={lms_id}, course_id={course_id}")
    
    return response.data[0]


async def get_module_items_by_type(
    module_id: str,
    item_type: str
) -> List[Dict[str, Any]]:
    """
    Get module items filtered by type.
    
    Args:
        module_id: Module ID
        item_type: Type of items to fetch (File, Page, Discussion, Assignment, etc.)
    
    Returns:
        List of module item dictionaries filtered by type
    """
    print(f"calling get_module_items_by_type with module_id={module_id}, item_type={item_type}")
    
    supabase = get_supabase_client()
    
    response = (
        supabase.table("module_items")
        .select("*")
        .eq("module_id", module_id)
        .eq("type", item_type)
        .order("position")
        .execute()
    )
    
    return response.data


async def get_course_module_items(
    course_id: str,
    item_type: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Get all module items for a course, optionally filtered by type.
    
    Args:
        course_id: Course ID
        item_type: Optional type filter (File, Page, Discussion, Assignment, etc.)
    
    Returns:
        List of module item dictionaries
    """
    print(f"calling get_course_module_items with course_id={course_id}, item_type={item_type}")
    
    supabase = get_supabase_client()
    
    query = (
        supabase.table("module_items")
        .select("*")
        .eq("course_id", course_id)
    )
    
    if item_type:
        query = query.eq("type", item_type)
    
    response = query.order("position").execute()
    
    return response.data


async def get_module_item(
    item_id: str
) -> Dict[str, Any]:
    """
    Get a specific module item from Supabase.
    
    Args:
        item_id: Module item ID
    
    Returns:
        Module item data dictionary
    
    Raises:
        Exception: If module item is not found or query fails
    """
    print(f"calling get_module_item with item_id={item_id}")
    
    supabase = get_supabase_client()
    
    response = supabase.table("module_items").select("*").eq("id", item_id).execute()
    
    if not response.data:
        raise Exception(f"Module item not found: {item_id}")
    
    return response.data[0]


async def get_modules_with_items(
    course_id: str
) -> List[Dict[str, Any]]:
    """
    Get all modules for a course with their items included.
    
    Args:
        course_id: Course ID
    
    Returns:
        List of module dictionaries with items nested
    """
    print(f"calling get_modules_with_items with course_id={course_id}")
    
    supabase = get_supabase_client()
    
    # Get modules
    modules_response = (
        supabase.table("modules")
        .select("*")
        .eq("course_id", course_id)
        .order("created_at")
        .execute()
    )
    
    modules = modules_response.data
    
    # Get all module items for this course
    items_response = (
        supabase.table("module_items")
        .select("*")
        .eq("course_id", course_id)
        .order("position")
        .execute()
    )
    
    items_by_module = {}
    for item in items_response.data:
        module_id = item.get("module_id")
        if module_id not in items_by_module:
            items_by_module[module_id] = []
        items_by_module[module_id].append(item)
    
    # Add items to each module
    for module in modules:
        module["items"] = items_by_module.get(module["id"], [])
    
    return modules


async def get_course_with_modules(
    course_id: str,
    include_items: bool = False
) -> Dict[str, Any]:
    """
    Get a course with its modules (and optionally module items) included.
    
    Args:
        course_id: Course ID
        include_items: If True, include module items in each module
    
    Returns:
        Course dictionary with modules nested
    """
    print(f"calling get_course_with_modules with course_id={course_id}, include_items={include_items}")
    
    # Get course
    course = await get_course(course_id=course_id)
    
    # Get modules with or without items
    if include_items:
        modules = await get_modules_with_items(course_id)
    else:
        modules = await get_course_modules(course_id)
    
    course["modules"] = modules
    
    return course


async def search_courses(
    search_term: str,
    user_id: str
) -> List[Dict[str, Any]]:
    """
    Search courses by name or code for a specific user.
    
    Args:
        search_term: Search term to match against course name or code
        user_id: User ID
    
    Returns:
        List of matching course dictionaries
    """
    print(f"calling search_courses with search_term={search_term}, user_id={user_id}")
    
    # Get user's courses
    courses = await get_courses(user_id)
    
    # Filter by search term
    search_term_lower = search_term.lower()
    matching_courses = [
        course for course in courses
        if search_term_lower in course.get("name", "").lower()
        or search_term_lower in course.get("code", "").lower()
    ]
    
    return matching_courses


# Chat System Functions

async def get_or_create_chat_session(
    user_id: str,
    document_id: str
) -> Dict[str, Any]:
    """
    Get existing chat session or create a new one for user-document pair.
    
    Args:
        user_id: User ID
        document_id: Module item ID (document ID)
    
    Returns:
        Chat session dictionary
    """
    print(f"calling get_or_create_chat_session with user_id={user_id}, document_id={document_id}")    
    supabase = get_supabase_client()
    
    # Try to get existing session
    response = supabase.table("document_chats").select("*").eq("user_id", user_id).eq("document_id", document_id).execute()
    
    if response.data:
        return response.data[0]
    
    # Create new session
    new_session = {
        "user_id": user_id,
        "document_id": document_id,
        "title": None
    }
    
    # Insert the new session
    insert_response = supabase.table("document_chats").insert(new_session).execute()
    
    if not insert_response.data:
        raise Exception("Failed to create chat session")
    
    # Get the created session
    created_session = insert_response.data[0]
    return created_session


async def get_chat_messages(
    chat_id: str,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """
    Get recent chat messages for a session.
    
    Args:
        chat_id: Chat session ID
        limit: Maximum number of messages to retrieve
    
    Returns:
        List of message dictionaries ordered by creation time
    """
    print(f"calling get_chat_messages with chat_id={chat_id}, limit={limit}")
    
    supabase = get_supabase_client()
    
    response = supabase.table("chat_messages").select("*").eq("chat_id", chat_id).order("created_at", desc=False).limit(limit).execute()
    
    return response.data


async def batch_save_messages(
    chat_id: str,
    messages: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Save multiple messages to a chat session.
    
    Args:
        chat_id: Chat session ID
        messages: List of message dictionaries with sender, content, tokens, metadata
    
    Returns:
        List of saved message dictionaries
    """
    print(f"calling batch_save_messages with chat_id={chat_id}, message_count={len(messages)}")
    
    supabase = get_supabase_client()
    
    # Prepare messages for insertion
    message_records = []
    for msg in messages:
        record = {
            "chat_id": chat_id,
            "sender": msg["sender"],
            "content": msg["content"],
            "tokens": msg.get("tokens"),
            "metadata": msg.get("metadata")
        }
        message_records.append(record)
    
    # Insert the messages
    insert_response = supabase.table("chat_messages").insert(message_records).execute()
    
    if not insert_response.data:
        raise Exception("Failed to save messages")
    
    return insert_response.data


async def get_latest_context_snapshot(
    chat_id: str
) -> Optional[Dict[str, Any]]:
    """
    Get the most recent context snapshot for a chat session.
    
    Args:
        chat_id: Chat session ID
    
    Returns:
        Latest context snapshot dictionary or None
    """
    print(f"calling get_latest_context_snapshot with chat_id={chat_id}")
    
    supabase = get_supabase_client()
    
    response = supabase.table("chat_context_snapshots").select("*").eq("chat_id", chat_id).order("created_at", desc=True).limit(1).execute()
    
    return response.data[0] if response.data else None


async def create_context_snapshot(
    chat_id: str,
    summary: str,
    message_count: int
) -> Dict[str, Any]:
    """
    Create or update a context snapshot for a chat session.
    Checks if a snapshot exists first, then updates or inserts accordingly.
    The unique constraint on chat_id ensures database integrity.
    
    Args:
        chat_id: Chat session ID
        summary: Summary text
        message_count: Number of messages summarized
    
    Returns:
        Created or updated context snapshot dictionary
    """
    print(f"calling create_context_snapshot with chat_id={chat_id}, message_count={message_count}")
    
    supabase = get_supabase_client()
    
    # Check if a snapshot already exists for this chat_id
    existing_snapshot = await get_latest_context_snapshot(chat_id=chat_id)
    
    snapshot_data = {
        "summary": summary,
        "message_count": message_count
    }
    
    if existing_snapshot:
        # Update the existing snapshot
        print(f"Updating existing snapshot {existing_snapshot['id']} for chat_id={chat_id}")
        update_response = (
            supabase.table("chat_context_snapshots")
            .update(snapshot_data)
            .eq("id", existing_snapshot["id"])
            .execute()
        )
        
        if not update_response.data:
            raise Exception("Failed to update context snapshot")
        
        return update_response.data[0]
    else:
        # Insert a new snapshot
        print(f"Creating new snapshot for chat_id={chat_id}")
        snapshot_data["chat_id"] = chat_id  # Add chat_id for insert
        insert_response = supabase.table("chat_context_snapshots").insert(snapshot_data).execute()
        
        if not insert_response.data:
            raise Exception("Failed to create context snapshot")
        
        return insert_response.data[0]


async def get_chat_message_count(
    chat_id: str
) -> int:
    """
    Get the total number of messages in a chat session.
    
    Args:
        chat_id: Chat session ID
    
    Returns:
        Total message count
    """
    print(f"calling get_chat_message_count with chat_id={chat_id}")
    
    supabase = get_supabase_client()
    
    response = supabase.table("chat_messages").select("id", count="exact").eq("chat_id", chat_id).execute()
    
    return response.count or 0