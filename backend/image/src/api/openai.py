"""
OpenAI API integration for autograder functionality.
Handles file uploads, assistant creation, and grading operations.
"""

import os
import tempfile
import asyncio
from typing import List
from openai import AsyncOpenAI
from fastapi import UploadFile
from prompts.autograder_prompt import AUTOGRADER_INSTRUCTIONS

# Initialize OpenAI client
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


async def upload_file_to_openai(file_path: str, purpose: str = "assistants") -> str:
    """
    Upload a file to OpenAI Files API.
    
    Args:
        file_path: Path to the file to upload
        purpose: Purpose of the file (default: "assistants")
    
    Returns:
        OpenAI file ID
    """
    try:
        with open(file_path, "rb") as file:
            response = await client.files.create(
                file=file,
                purpose=purpose
            )
        return response.id
    except Exception as e:
        raise Exception(f"Failed to upload file to OpenAI: {str(e)}")


async def create_grading_assistant(
    name: str = "Autograder Assistant",
) -> str:
    """
    Create an OpenAI Assistant for grading assignments.
    
    Args:
        name: Name of the assistant
    
    Returns:
        Assistant ID
    """
    try:
        response = await client.beta.assistants.create(
            name=name,
            instructions=AUTOGRADER_INSTRUCTIONS,
            model="gpt-4o",
            tools=[{"type": "file_search"}]
        )
        return response.id
    except Exception as e:
        raise Exception(f"Failed to create grading assistant: {str(e)}")


async def run_grading_assistant(
    assistant_id: str,
    thread_id: str = None,
    message: str = None,
    file_ids: List[str] = None
) -> str:
    """
    Run the grading assistant and get feedback.
    
    Args:
        assistant_id: ID of the assistant to run
        thread_id: Existing thread ID (optional)
        message: Message to send to the assistant
        file_ids: List of file IDs to attach
    
    Returns:
        Assistant's response text
    """
    try:
        # Create thread if not provided
        if not thread_id:
            thread_response = await client.beta.threads.create()
            thread_id = thread_response.id

        # Default message if none provided
        if not message:
            message = """
            Please analyze the attached assignment and student solution files. 
            Provide detailed feedback on the student's work, including:
            1. Overall assessment of the solution
            2. Strengths in the student's approach
            3. Areas that need improvement
            4. Specific suggestions for enhancement
            5. Encouragement for continued learning

            Be thorough, constructive, and educational in your feedback.
            """

        # Create message with attachments
        message_data = {
            "role": "user",
            "content": message
        }
        
        if file_ids:
            message_data["attachments"] = [
                {"file_id": file_id, "tools": [{"type": "file_search"}]}
                for file_id in file_ids
            ]

        # Add message to thread
        await client.beta.threads.messages.create(
            thread_id=thread_id,
            **message_data
        )

        # Run the assistant
        run = await client.beta.threads.runs.create(
            thread_id=thread_id,
            assistant_id=assistant_id
        )

        # Wait for completion
        while True:
            run_status = await client.beta.threads.runs.retrieve(
                thread_id=thread_id,
                run_id=run.id
            )
            
            if run_status.status == "completed":
                break
            elif run_status.status == "failed":
                raise Exception(f"Assistant run failed: {run_status.last_error}")
            elif run_status.status in ["cancelled", "expired"]:
                raise Exception(f"Assistant run {run_status.status}")
            
            # Wait before checking again
            await asyncio.sleep(1)

        # Get the assistant's response
        messages = await client.beta.threads.messages.list(thread_id=thread_id)
        
        # Find the assistant's latest message
        for message in messages.data:
            if message.role == "assistant":
                # Extract text content from the message
                for content in message.content:
                    if content.type == "text":
                        return content.text.value
        
        raise Exception("No response received from assistant")

    except Exception as e:
        raise Exception(f"Failed to run grading assistant: {str(e)}")


async def cleanup_openai_files(file_ids: List[str]) -> None:
    """
    Delete files from OpenAI Files API.
    
    Args:
        file_ids: List of file IDs to delete
    """
    for file_id in file_ids:
        try:
            await client.files.delete(file_id)
        except Exception as e:
            print(f"Warning: Failed to delete OpenAI file {file_id}: {str(e)}")


async def cleanup_openai_assistant(assistant_id: str) -> None:
    """
    Delete an OpenAI Assistant.
    
    Args:
        assistant_id: Assistant ID to delete
    """
    try:
        await client.beta.assistants.delete(assistant_id)
    except Exception as e:
        print(f"Warning: Failed to delete OpenAI assistant {assistant_id}: {str(e)}")


async def save_uploaded_files_to_temp(uploaded_files: List[UploadFile]) -> List[str]:
    """
    Save uploaded files to temporary directory.
    
    Args:
        uploaded_files: List of FastAPI UploadFile objects
    
    Returns:
        List of temporary file paths
    """
    temp_paths = []
    
    for uploaded_file in uploaded_files:
        # Create temporary file
        temp_file = tempfile.NamedTemporaryFile(
            delete=False,
            suffix=f"_{uploaded_file.filename}"
        )
        
        # Write file content
        content = await uploaded_file.read()
        temp_file.write(content)
        temp_file.close()
        
        temp_paths.append(temp_file.name)
    
    return temp_paths


async def cleanup_temp_files(file_paths: List[str]) -> None:
    """
    Clean up temporary files.
    
    Args:
        file_paths: List of file paths to delete
    """
    for file_path in file_paths:
        try:
            os.unlink(file_path)
        except Exception as e:
            print(f"Warning: Failed to delete temp file {file_path}: {str(e)}")
