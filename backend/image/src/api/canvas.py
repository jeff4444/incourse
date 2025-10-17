"""
Core Canvas API functions without RunContext dependency.
All functions accept explicit parameters instead of extracting from context.
"""

import asyncio
import aiohttp
import tempfile
import os
from typing import List, Dict, Optional, Any
from shared.utils.canvas_utils import parse_file_content
import shutil


async def get_overall_course_performance(
    api_key: str,
    api_base_url: str,
    course_id: Optional[str] = None
) -> Dict:
    """
    Get overall course performance for a specific course or all courses.
    Returns performance data including current/final scores and grades.
    """
    print(f"calling get_overall_course_performance with course_id={course_id}")
    
    if course_id:
        # Get performance for specific course
        url = f"{api_base_url}/courses/{course_id}"
        params = {"include[]": "total_scores"}
    else:
        # Get performance for all courses
        url = f"{api_base_url}/courses"
        params = {"include[]": "total_scores", "per_page": 100}
    
    async with aiohttp.ClientSession() as session:
        async with session.get(
            url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            params=params
        ) as response:
            if not response.ok:
                raise Exception(f"Failed to fetch course performance: {response.status}")
            
            data = await response.json()
            
            if course_id:
                # Single course response
                enroll = next(
                    (e for e in data.get("enrollments", [])
                     if e.get("type") == "student"),
                    {}
                )
                return {
                    "course_id": data.get("id"),
                    "course_name": data.get("name"),
                    "current_score": enroll.get("computed_current_score"),
                    "current_grade": enroll.get("computed_current_grade"),
                    "final_score": enroll.get("computed_final_score"),
                    "final_grade": enroll.get("computed_final_grade"),
                }
            else:
                # Multiple courses response
                performance_data = []
                for course in data:
                    enroll = next(
                        (e for e in course.get("enrollments", [])
                         if e.get("type") == "student"),
                        {}
                    )
                    performance_data.append({
                        "course_id": course.get("id"),
                        "course_name": course.get("name"),
                        "current_score": enroll.get("computed_current_score"),
                        "current_grade": enroll.get("computed_current_grade"),
                        "final_score": enroll.get("computed_final_score"),
                        "final_grade": enroll.get("computed_final_grade"),
                    })
                return {"courses": performance_data}


async def get_course_grade_details(
    api_key: str,
    api_base_url: str,
    course_id: str
) -> Dict:
    """
    Get detailed grade information for a specific course including all assignments.
    """
    print(f"calling get_course_grade_details with course_id={course_id}")
    
    # Get course info with scores
    course_url = f"{api_base_url}/courses/{course_id}"
    course_params = {"include[]": "total_scores"}
    
    # Get assignments with submissions
    assignments_url = f"{api_base_url}/courses/{course_id}/assignments"
    assignments_params = {"include[]": "submission", "per_page": 100}
    
    async with aiohttp.ClientSession() as session:
        # Get course data
        async with session.get(
            course_url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            params=course_params
        ) as course_response:
            if not course_response.ok:
                raise Exception(f"Failed to fetch course: {course_response.status}")
            course_data = await course_response.json()
        
        # Get assignments data
        async with session.get(
            assignments_url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            params=assignments_params
        ) as assignments_response:
            if not assignments_response.ok:
                raise Exception(f"Failed to fetch assignments: {assignments_response.status}")
            assignments_data = await assignments_response.json()
    
    # Extract enrollment info
    enroll = next(
        (e for e in course_data.get("enrollments", [])
         if e.get("type") == "student"),
        {}
    )
    
    # Process assignments
    assignment_grades = []
    for assignment in assignments_data:
        submission = assignment.get("submission") or {}
        assignment_grades.append({
            "assignment_id": assignment.get("id"),
            "assignment_name": assignment.get("name"),
            "points_possible": assignment.get("points_possible"),
            "score": submission.get("score"),
            "grade": submission.get("grade"),
            "submitted_at": submission.get("submitted_at"),
            "workflow_state": submission.get("workflow_state"),
        })
    
    return {
        "course_id": course_data.get("id"),
        "course_name": course_data.get("name"),
        "current_score": enroll.get("computed_current_score"),
        "current_grade": enroll.get("computed_current_grade"),
        "final_score": enroll.get("computed_final_score"),
        "final_grade": enroll.get("computed_final_grade"),
        "assignments": assignment_grades,
    }


async def get_assignment_grades(
    api_key: str,
    api_base_url: str,
    course_id: str,
    assignment_id: Optional[str] = None
) -> List[Dict]:
    """
    Get assignment grades for a specific course, optionally for a specific assignment.
    """
    print(f"calling get_assignment_grades with course_id={course_id}, assignment_id={assignment_id}")
    
    if assignment_id:
        # Get specific assignment
        url = f"{api_base_url}/courses/{course_id}/assignments/{assignment_id}"
        params = {"include[]": "submission"}
    else:
        # Get all assignments
        url = f"{api_base_url}/courses/{course_id}/assignments"
        params = {"include[]": "submission", "per_page": 100}
    
    async with aiohttp.ClientSession() as session:
        async with session.get(
            url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            params=params
        ) as response:
            if not response.ok:
                raise Exception(f"Failed to fetch assignment grades: {response.status}")
            
            data = await response.json()
            
            if assignment_id:
                # Single assignment response
                submission = data.get("submission") or {}
                return [{
                    "assignment_id": data.get("id"),
                    "assignment_name": data.get("name"),
                    "points_possible": data.get("points_possible"),
                    "score": submission.get("score"),
                    "grade": submission.get("grade"),
                    "submitted_at": submission.get("submitted_at"),
                    "workflow_state": submission.get("workflow_state"),
                }]
            else:
                # Multiple assignments response
                assignment_grades = []
                for assignment in data:
                    submission = assignment.get("submission") or {}
                    assignment_grades.append({
                        "assignment_id": assignment.get("id"),
                        "assignment_name": assignment.get("name"),
                        "points_possible": assignment.get("points_possible"),
                        "score": submission.get("score"),
                        "grade": submission.get("grade"),
                        "submitted_at": submission.get("submitted_at"),
                        "workflow_state": submission.get("workflow_state"),
                    })
                return assignment_grades


async def get_all_grades(
    api_key: str,
    api_base_url: str
) -> Dict:
    """
    Get comprehensive grade information for all courses and their assignments.
    """
    print("calling get_all_grades")
    
    # Get all courses with scores
    courses_url = f"{api_base_url}/courses"
    courses_params = {"include[]": "total_scores", "per_page": 100}
    
    async with aiohttp.ClientSession() as session:
        async with session.get(
            courses_url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            params=courses_params
        ) as response:
            if not response.ok:
                raise Exception(f"Failed to fetch courses: {response.status}")
            courses_data = await response.json()
    
    all_grades = []
    
    for course in courses_data:
        course_id = course.get("id")
        course_name = course.get("name")
        
        # Extract enrollment info
        enroll = next(
            (e for e in course.get("enrollments", [])
             if e.get("type") == "student"),
            {}
        )
        
        # Get assignments for this course
        try:
            assignments = await get_assignment_grades(api_key, api_base_url, str(course_id))
        except Exception as e:
            # If we can't get assignments, continue with course-level data only
            assignments = []
        
        all_grades.append({
            "course_id": course_id,
            "course_name": course_name,
            "current_score": enroll.get("computed_current_score"),
            "current_grade": enroll.get("computed_current_grade"),
            "final_score": enroll.get("computed_final_score"),
            "final_grade": enroll.get("computed_final_grade"),
            "assignments": assignments,
        })
    
    return {"courses": all_grades}


async def get_some_grades(
    api_key: str,
    api_base_url: str,
    course_ids: List[str],
    include_assignments: bool = True
) -> Dict:
    """
    Get grade information for specific courses by their IDs.
    """
    print(f"calling get_some_grades with course_ids={course_ids}, include_assignments={include_assignments}")
    
    selected_grades = []
    
    async with aiohttp.ClientSession() as session:
        for course_id in course_ids:
            # Get course info with scores
            course_url = f"{api_base_url}/courses/{course_id}"
            course_params = {"include[]": "total_scores"}
            
            try:
                async with session.get(
                    course_url,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    params=course_params
                ) as response:
                    if not response.ok:
                        continue  # Skip this course if we can't fetch it
                    
                    course_data = await response.json()
                    
                    # Extract enrollment info
                    enroll = next(
                        (e for e in course_data.get("enrollments", [])
                         if e.get("type") == "student"),
                        {}
                    )
                    
                    course_grade = {
                        "course_id": course_data.get("id"),
                        "course_name": course_data.get("name"),
                        "current_score": enroll.get("computed_current_score"),
                        "current_grade": enroll.get("computed_current_grade"),
                        "final_score": enroll.get("computed_final_score"),
                        "final_grade": enroll.get("computed_final_grade"),
                    }
                    
                    # Get assignments if requested
                    if include_assignments:
                        try:
                            assignments = await get_assignment_grades(api_key, api_base_url, str(course_id))
                            course_grade["assignments"] = assignments
                        except Exception:
                            course_grade["assignments"] = []
                    
                    selected_grades.append(course_grade)
                    
            except Exception:
                continue  # Skip this course if there's an error
    
    return {"courses": selected_grades}


async def get_course_analytics(
    api_key: str,
    api_base_url: str,
    course_id: str
) -> Dict:
    """
    Get analytics data for a specific course including participation and performance metrics.
    """
    print(f"calling get_course_analytics with course_id={course_id}")
    
    # Get course analytics
    analytics_url = f"{api_base_url}/courses/{course_id}/analytics"
    
    async with aiohttp.ClientSession() as session:
        async with session.get(
            analytics_url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
        ) as response:
            if not response.ok:
                raise Exception(f"Failed to fetch course analytics: {response.status}")
            
            analytics_data = await response.json()
            return analytics_data


async def get_student_analytics(
    api_key: str,
    api_base_url: str,
    course_id: str,
    student_id: Optional[str] = None
) -> Dict:
    """
    Get student analytics for a specific course, optionally for a specific student.
    """
    print(f"calling get_student_analytics with course_id={course_id}, student_id={student_id}")
    
    if student_id:
        # Get analytics for specific student
        url = f"{api_base_url}/courses/{course_id}/analytics/users/{student_id}"
    else:
        # Get analytics for current user
        url = f"{api_base_url}/courses/{course_id}/analytics/users/self"
    
    async with aiohttp.ClientSession() as session:
        async with session.get(
            url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
        ) as response:
            if not response.ok:
                raise Exception(f"Failed to fetch student analytics: {response.status}")
            
            analytics_data = await response.json()
            return analytics_data


async def get_canvas_courses(
    api_key: str,
    api_base_url: str
) -> List[Dict]:
    """
    Get all courses from Canvas API.
    """
    print("calling get_canvas_courses")
    
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{api_base_url}/courses?per_page=100",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
        ) as response:
            if not response.ok:
                raise Exception("Failed to fetch courses")
            
            courses_data = await response.json()
            
            # Filter out courses with access restrictions
            filtered_courses = [
                course for course in courses_data 
                if not course.get("access_restricted_by_date", False)
            ]
            
            return filtered_courses


async def get_canvas_course(
    api_key: str,
    api_base_url: str,
    course_id: str
) -> Dict:
    """
    Get a specific course from Canvas API.
    """
    print(f"calling get_canvas_course with course_id={course_id}")
    
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{api_base_url}/courses/{course_id}",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
        ) as response:
            if not response.ok:
                raise Exception("Failed to fetch course")
            
            course_data = await response.json()
            return course_data


async def get_canvas_course_modules(
    api_key: str,
    api_base_url: str,
    course_id: str
) -> List[Dict]:
    """
    Get all modules for a specific course from Canvas API.
    """
    print(f"calling get_canvas_course_modules with course_id={course_id}")
    
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{api_base_url}/courses/{course_id}/modules?per_page=100",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
        ) as response:
            if not response.ok:
                raise Exception("Failed to fetch course modules")
            
            modules_data = await response.json()
            return modules_data


async def get_canvas_module_items(
    api_key: str,
    api_base_url: str,
    course_id: str,
    module_id: str
) -> List[Dict]:
    """
    Get all items for a specific module from Canvas API.
    """
    print(f"calling get_canvas_module_items with module_id={module_id}, course_id={course_id}")
    
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{api_base_url}/courses/{course_id}/modules/{module_id}/items?per_page=100",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
        ) as response:
            if not response.ok:
                raise Exception("Failed to fetch module items")
            
            module_items_data = await response.json()
            return module_items_data


async def get_file_details_with_content(
    api_key: str,
    api_base_url: str,
    course_id: str,
    file_id: str
) -> Dict:
    """
    Get file details and content for a specific file from Canvas API.
    """
    print(f"calling get_canvas_file_details_with_content with file_id={file_id}, course_id={course_id}")

    async with aiohttp.ClientSession() as session:
        # First, get file metadata
        async with session.get(
            f"{api_base_url}/courses/{course_id}/files/{file_id}",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
        ) as response:
            if not response.ok:
                raise Exception("Failed to fetch file details")
            
            file_details_data = await response.json()
        
        # Try to fetch and parse the actual file content
        file_url = file_details_data.get('url')
        content_type = file_details_data.get('content-type', '')
        filename = file_details_data.get('filename', '')
        
        if file_url and content_type:
            try:
                async with session.get(file_url) as file_response:
                    if file_response.ok:
                        file_content = await file_response.read()
                        # Only parse if file is not too large (limit to 10MB)
                        if len(file_content) < 10 * 1024 * 1024:
                            # Create a temporary local file
                            file_extension = filename.split('.')[-1] if '.' in filename else 'tmp'
                            with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{file_extension}') as temp_file:
                                temp_file.write(file_content)
                                temp_file_path = temp_file.name
                            try:
                                parsed_content = await parse_file_content(temp_file_path, content_type, filename, file_extension)
                                file_details_data['parsed_content'] = parsed_content
                            finally:
                                # Clean up the temporary file
                                os.unlink(temp_file_path)
                        else:
                            file_details_data['parsed_content'] = f"[File too large to parse ({len(file_content)} bytes)]"
                    else:
                        file_details_data['parsed_content'] = f"[Could not download file content: HTTP {file_response.status}]"
            except Exception as e:
                file_details_data['parsed_content'] = f"[Error fetching file content: {str(e)}]"
        else:
            file_details_data['parsed_content'] = "[No file URL or content type available]"

        return file_details_data


async def get_file_details_with_temp_file(
    api_key: str,
    api_base_url: str,
    course_id: str,
    file_id: str
) -> tuple[Dict, str]:
    """
    Get file details and download the actual file to a temporary location.
    Returns both the file details and the path to the temporary file.
    
    Returns:
        tuple: (file_details_dict, temp_file_path)
    """
    print(f"calling get_file_details_with_temp_file with file_id={file_id}, course_id={course_id}")

    async with aiohttp.ClientSession() as session:
        # First, get file metadata
        async with session.get(
            f"{api_base_url}/courses/{course_id}/files/{file_id}",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
        ) as response:
            if not response.ok:
                raise Exception("Failed to fetch file details")
            
            file_details_data = await response.json()
        
        # Try to fetch the actual file content
        file_url = file_details_data.get('url')
        content_type = file_details_data.get('content-type', '')
        filename = file_details_data.get('filename', '')
        
        if file_url and content_type:
            try:
                async with session.get(file_url) as file_response:
                    if file_response.ok:
                        file_content = await file_response.read()
                        # Only download if file is not too large (limit to 10MB)
                        if len(file_content) < 10 * 1024 * 1024:
                            # Create a temporary local file and keep it
                            file_extension = filename.split('.')[-1] if '.' in filename else 'tmp'
                            with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{file_extension}') as temp_file:
                                temp_file.write(file_content)
                                temp_file_path = temp_file.name
                            
                            # Add temp file path to the details
                            file_details_data['temp_file_path'] = temp_file_path
                            return file_details_data, temp_file_path
                        else:
                            raise Exception(f"File too large to download ({len(file_content)} bytes)")
                    else:
                        raise Exception(f"Could not download file content: HTTP {file_response.status}")
            except Exception as e:
                raise Exception(f"Error fetching file content: {str(e)}")
        else:
            raise Exception("No file URL or content type available")


async def get_canvas_files_details(
    api_key: str,
    api_base_url: str,
    course_id: str,
    file_ids: List[str],
    include_content: bool = True
) -> List[Dict]:
    """
    Get all files for a specific course from Canvas API.
    """
    print(f"calling get_canvas_files_details with course_id={course_id}, file_ids={file_ids}")
    
    file_details_list = []
    
    for file_id in file_ids:
        if include_content:
            file_details = await get_file_details_with_content(api_key, api_base_url, course_id, file_id)
        else:
            file_details = await get_file_details_with_temp_file(api_key, api_base_url, course_id, file_id)
            file_details = file_details[0]  # Extract just the details, not the temp path
        file_details_list.append(file_details)
    
    return file_details_list


async def get_canvas_course_assignments(
    api_key: str,
    api_base_url: str,
    course_id: str
) -> List[Dict]:
    """
    Get all assignments for a specific course from Canvas API.
    """
    print(f"calling get_canvas_course_assignments with course_id={course_id}")
    
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{api_base_url}/courses/{course_id}/assignments?per_page=100",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
        ) as response:
            if not response.ok:
                raise Exception("Failed to fetch course assignments")
            
            assignments_data = await response.json()
            return assignments_data



async def get_file_details(
    api_key: str,
    api_base_url: str,
    course_id: str,
    file_id: str
) -> Dict[str, Any]:
    """Fetch file details and content from the API."""
    print(f"calling get_file_details with file_id={file_id}, course_id={course_id}")
    async with aiohttp.ClientSession() as session:
        # Get file metadata
        async with session.get(
            f"{api_base_url}/courses/{course_id}/files/{file_id}",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
        ) as response:
            if not response.ok:
                raise Exception(f"Failed to fetch file details: {response.status}")
            
            file_details = await response.json()
        
        return file_details


async def get_course_details(
    api_key: str,
    api_base_url: str,
    course_id: str
) -> Dict[str, Any]:
    """Fetch course details from the API."""
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{api_base_url}/courses/{course_id}",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
        ) as response:
            if not response.ok:
                raise Exception(f"Failed to fetch course details: {response.status}")
            return await response.json()