"""
Supabase tools for fetching user, course, and module data.

This module provides tools to fetch data from the Supabase database,
similar to how the frontend fetches data via API calls.
"""

import os
from typing import List, Dict, Any, Optional
from pydantic_ai import RunContext
from dotenv import load_dotenv
from supabase import create_client, Client

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
    ctx: RunContext,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get user information from Supabase.
    
    Args:
        ctx: RunContext containing dependencies
        user_id: Optional user ID, defaults to ctx.deps.user_id
    
    Returns:
        User data dictionary
    
    Raises:
        Exception: If user is not found or query fails
    """
    user_id = user_id or ctx.deps.user_id
    print(f"calling get_user with user_id={user_id}")
    
    supabase = get_supabase_client()
    
    response = supabase.table("users").select("*").eq("id", user_id).execute()
    
    if not response.data:
        raise Exception(f"User not found: {user_id}")
    
    return response.data[0]


async def get_user_by_email(
    ctx: RunContext,
    email: str
) -> Dict[str, Any]:
    """
    Get user information by email from Supabase.
    
    Args:
        ctx: RunContext containing dependencies
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


async def get_user_api_keys(
    ctx: RunContext,
    user_id: Optional[str] = None,
    lms_provider: Optional[str] = None,
    active_only: bool = True
) -> List[Dict[str, Any]]:
    """
    Get user API keys from Supabase.
    
    Args:
        ctx: RunContext containing dependencies
        user_id: Optional user ID, defaults to ctx.deps.user_id
        lms_provider: Optional filter by LMS provider (canvas, blackboard, moodle, d2l)
        active_only: If True, only return active API keys
    
    Returns:
        List of user API key dictionaries
    """
    user_id = user_id or ctx.deps.user_id
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
    ctx: RunContext,
    user_id: Optional[str] = None,
    lms_provider: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Get all courses for a user from Supabase.
    
    Args:
        ctx: RunContext containing dependencies
        user_id: Optional user ID, defaults to ctx.deps.user_id
        lms_provider: Optional filter by LMS provider
    
    Returns:
        List of course dictionaries with enrollment information
    """
    user_id = user_id or ctx.deps.user_id
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
    ctx: RunContext,
    course_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get a specific course from Supabase.
    
    Args:
        ctx: RunContext containing dependencies
        course_id: Optional course ID, defaults to ctx.deps.course_id
    
    Returns:
        Course data dictionary
    
    Raises:
        Exception: If course is not found or query fails
    """
    course_id = course_id or ctx.deps.course_id
    print(f"calling get_course with course_id={course_id}")
    
    supabase = get_supabase_client()
    
    response = supabase.table("courses").select("*").eq("id", course_id).execute()
    
    if not response.data:
        raise Exception(f"Course not found: {course_id}")
    
    return response.data[0]


async def get_course_by_lms_id(
    ctx: RunContext,
    lms_id: str,
    lms_provider: str
) -> Dict[str, Any]:
    """
    Get a course by its LMS ID and provider.
    
    Args:
        ctx: RunContext containing dependencies
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
    ctx: RunContext,
    user_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Get all enrollments for a user.
    
    Args:
        ctx: RunContext containing dependencies
        user_id: Optional user ID, defaults to ctx.deps.user_id
    
    Returns:
        List of enrollment dictionaries
    """
    user_id = user_id or ctx.deps.user_id
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
    ctx: RunContext,
    course_id: str,
    user_id: Optional[str] = None
) -> bool:
    """
    Check if a user is enrolled in a course.
    
    Args:
        ctx: RunContext containing dependencies
        course_id: Course ID
        user_id: Optional user ID, defaults to ctx.deps.user_id
    
    Returns:
        True if enrolled, False otherwise
    """
    user_id = user_id or ctx.deps.user_id
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
    ctx: RunContext,
    course_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Get all modules for a course from Supabase.
    
    Args:
        ctx: RunContext containing dependencies
        course_id: Optional course ID, defaults to ctx.deps.course_id
    
    Returns:
        List of module dictionaries
    """
    course_id = course_id or ctx.deps.course_id
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
    ctx: RunContext,
    module_id: str
) -> Dict[str, Any]:
    """
    Get a specific module from Supabase.
    
    Args:
        ctx: RunContext containing dependencies
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
    ctx: RunContext,
    lms_id: str,
    course_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get a module by its LMS ID and course ID.
    
    Args:
        ctx: RunContext containing dependencies
        lms_id: LMS module ID
        course_id: Optional course ID, defaults to ctx.deps.course_id
    
    Returns:
        Module data dictionary
    
    Raises:
        Exception: If module is not found or query fails
    """
    course_id = course_id or ctx.deps.course_id
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
    ctx: RunContext,
    module_id: str
) -> List[Dict[str, Any]]:
    """
    Get all items for a module from Supabase.
    
    Args:
        ctx: RunContext containing dependencies
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


async def get_module_items_by_type(
    ctx: RunContext,
    module_id: str,
    item_type: str
) -> List[Dict[str, Any]]:
    """
    Get module items filtered by type.
    
    Args:
        ctx: RunContext containing dependencies
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
    ctx: RunContext,
    course_id: Optional[str] = None,
    item_type: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Get all module items for a course, optionally filtered by type.
    
    Args:
        ctx: RunContext containing dependencies
        course_id: Optional course ID, defaults to ctx.deps.course_id
        item_type: Optional type filter (File, Page, Discussion, Assignment, etc.)
    
    Returns:
        List of module item dictionaries
    """
    course_id = course_id or ctx.deps.course_id
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
    ctx: RunContext,
    item_id: str
) -> Dict[str, Any]:
    """
    Get a specific module item from Supabase.
    
    Args:
        ctx: RunContext containing dependencies
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
    ctx: RunContext,
    course_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Get all modules for a course with their items included.
    
    Args:
        ctx: RunContext containing dependencies
        course_id: Optional course ID, defaults to ctx.deps.course_id
    
    Returns:
        List of module dictionaries with items nested
    """
    course_id = course_id or ctx.deps.course_id
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
    ctx: RunContext,
    course_id: Optional[str] = None,
    include_items: bool = False
) -> Dict[str, Any]:
    """
    Get a course with its modules (and optionally module items) included.
    
    Args:
        ctx: RunContext containing dependencies
        course_id: Optional course ID, defaults to ctx.deps.course_id
        include_items: If True, include module items in each module
    
    Returns:
        Course dictionary with modules nested
    """
    course_id = course_id or ctx.deps.course_id
    print(f"calling get_course_with_modules with course_id={course_id}, include_items={include_items}")
    
    # Get course
    course = await get_course(ctx, course_id)
    
    # Get modules with or without items
    if include_items:
        modules = await get_modules_with_items(ctx, course_id)
    else:
        modules = await get_course_modules(ctx, course_id)
    
    course["modules"] = modules
    
    return course


async def search_courses(
    ctx: RunContext,
    search_term: str,
    user_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Search courses by name or code for a specific user.
    
    Args:
        ctx: RunContext containing dependencies
        search_term: Search term to match against course name or code
        user_id: Optional user ID, defaults to ctx.deps.user_id
    
    Returns:
        List of matching course dictionaries
    """
    user_id = user_id or ctx.deps.user_id
    print(f"calling search_courses with search_term={search_term}, user_id={user_id}")
    
    supabase = get_supabase_client()
    
    # Get user's courses
    courses = await get_courses(ctx, user_id)
    
    # Filter by search term
    search_term_lower = search_term.lower()
    matching_courses = [
        course for course in courses
        if search_term_lower in course.get("name", "").lower()
        or search_term_lower in course.get("code", "").lower()
    ]
    
    return matching_courses

