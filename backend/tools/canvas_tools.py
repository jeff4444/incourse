"""
Canvas tool wrappers that extract parameters from RunContext and call core API functions.
"""

import asyncio
import random
from pydantic_ai import RunContext
from typing import List, Dict, Optional

# Import core API functions
from api import canvas as canvas_api


async def get_overall_course_performance(
    ctx: RunContext,
    course_id: Optional[str] = None
) -> Dict:
    """
    Get overall course performance for a specific course or all courses.
    Returns performance data including current/final scores and grades.
    """
    return await canvas_api.get_overall_course_performance(
        api_key=ctx.deps.lms_api_key,
        api_base_url=ctx.deps.lms_base_url,
        course_id=course_id
    )


async def get_course_grade_details(
    ctx: RunContext,
    course_id: str
) -> Dict:
    """
    Get detailed grade information for a specific course including all assignments.
    """
    return await canvas_api.get_course_grade_details(
        api_key=ctx.deps.lms_api_key,
        api_base_url=ctx.deps.lms_base_url,
        course_id=course_id
    )


async def get_assignment_grades(
    ctx: RunContext,
    course_id: str,
    assignment_id: Optional[str] = None
) -> List[Dict]:
    """
    Get assignment grades for a specific course, optionally for a specific assignment.
    """
    return await canvas_api.get_assignment_grades(
        api_key=ctx.deps.lms_api_key,
        api_base_url=ctx.deps.lms_base_url,
        course_id=course_id,
        assignment_id=assignment_id
    )


async def get_all_grades(
    ctx: RunContext
) -> Dict:
    """
    Get comprehensive grade information for all courses and their assignments.
    """
    return await canvas_api.get_all_grades(
        api_key=ctx.deps.lms_api_key,
        api_base_url=ctx.deps.lms_base_url
    )


async def get_some_grades(
    ctx: RunContext,
    course_ids: List[str],
    include_assignments: bool = True
) -> Dict:
    """
    Get grade information for specific courses by their IDs.
    """
    return await canvas_api.get_some_grades(
        api_key=ctx.deps.lms_api_key,
        api_base_url=ctx.deps.lms_base_url,
        course_ids=course_ids,
        include_assignments=include_assignments
    )


async def get_course_analytics(
    ctx: RunContext,
    course_id: str
) -> Dict:
    """
    Get analytics data for a specific course including participation and performance metrics.
    """
    return await canvas_api.get_course_analytics(
        api_key=ctx.deps.lms_api_key,
        api_base_url=ctx.deps.lms_base_url,
        course_id=course_id
    )


async def get_student_analytics(
    ctx: RunContext,
    course_id: str,
    student_id: Optional[str] = None
) -> Dict:
    """
    Get student analytics for a specific course, optionally for a specific student.
    """
    return await canvas_api.get_student_analytics(
        api_key=ctx.deps.lms_api_key,
        api_base_url=ctx.deps.lms_base_url,
        course_id=course_id,
        student_id=student_id
    )


async def get_chat_history_summary(
    ctx: RunContext
) -> str:
    """
    Get chat history for the list of course IDs.
    """
    print("calling get_chat_history_summary")
    
    # Simulate a call to an external API to get chat history
    await asyncio.sleep(1)
    
    # For demonstration purposes, return a random chat history summary
    return "User has been asking about the course content and assignments. User seems to be struggling with the material. Would you like some help?"


async def get_course_quiz_history(
    ctx: RunContext
) -> List[Dict[str, str]]:
    """
    Get quiz history for the list of course IDs.
    """
    print("calling get_course_quiz_history")
    
    # Simulate a call to an external API to get quiz history
    await asyncio.sleep(1)
    
    # For demonstration purposes, return a list of random quiz history
    quiz_history = [
        {
            "quiz_id": f"quiz_{i}",
            "score": random.randint(0, 100),
            "date": f"2023-10-{random.randint(1, 30)}"
        }
        for i in range(1, 4)
    ]
    return quiz_history


async def get_file_content_summaries(
    ctx: RunContext
) -> Dict[str, str]:
    """
    Get file content summary for the list of file IDs.
    """
    print("calling get_file_content_summaries")
    
    # Simulate a call to an external API to get file content summary
    await asyncio.sleep(1)
    
    # For demonstration purposes, return a random file content summary
    file_content_summary = {
        "file_id": f"Summary for file"
    }
    return file_content_summary


async def get_canvas_courses(
    ctx: RunContext
) -> List[Dict]:
    """
    Get all courses from Canvas API.
    """
    return await canvas_api.get_canvas_courses(
        api_key=ctx.deps.lms_api_key,
        api_base_url=ctx.deps.lms_base_url
    )


async def get_canvas_course(
    ctx: RunContext,
) -> Dict:
    """
    Get a specific course from Canvas API.
    """
    return await canvas_api.get_canvas_course(
        api_key=ctx.deps.lms_api_key,
        api_base_url=ctx.deps.lms_base_url,
        course_id=ctx.deps.course_id
    )


async def get_canvas_course_modules(
    ctx: RunContext,
) -> List[Dict]:
    """
    Get all modules for a specific course from Canvas API.
    """
    return await canvas_api.get_canvas_course_modules(
        api_key=ctx.deps.lms_api_key,
        api_base_url=ctx.deps.lms_base_url,
        course_id=ctx.deps.course_id
    )


async def get_canvas_module_items(
    ctx: RunContext,
    module_id: str,
) -> List[Dict]:
    """
    Get all items for a specific module from Canvas API.
    """
    return await canvas_api.get_canvas_module_items(
        api_key=ctx.deps.lms_api_key,
        api_base_url=ctx.deps.lms_base_url,
        course_id=ctx.deps.course_id,
        module_id=module_id
    )


async def get_canvas_files_details(
    ctx: RunContext,
) -> List[Dict]:
    """
    Get all files for a specific course from Canvas API. YOU MUST CALL THIS TOOL WHEN VERY LITTLE CONTEXT IS PROVIDED.
    """
    return await canvas_api.get_canvas_files_details(
        api_key=ctx.deps.lms_api_key,
        api_base_url=ctx.deps.lms_base_url,
        course_id=ctx.deps.course_id,
        file_ids=ctx.deps.file_ids
    )


async def get_canvas_file_details(
    ctx: RunContext,
    file_id: str,
) -> Dict:
    """
    Get file details and content for a specific file from Canvas API.
    """
    return await canvas_api.get_canvas_file_details(
        api_key=ctx.deps.lms_api_key,
        api_base_url=ctx.deps.lms_base_url,
        course_id=ctx.deps.course_id,
        file_id=file_id
    )


async def get_canvas_course_assignments(
    ctx: RunContext,
    course_id: str
) -> List[Dict]:
    """
    Get all assignments for a specific course from Canvas API.
    """
    return await canvas_api.get_canvas_course_assignments(
        api_key=ctx.deps.lms_api_key,
        api_base_url=ctx.deps.lms_base_url,
        course_id=course_id
    )
