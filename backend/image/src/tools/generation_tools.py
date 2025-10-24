"""
Generation tool wrappers for chat agent to create quizzes and flashcards.
"""

import os
from pydantic_ai import RunContext
from typing import Dict, Any
from api.supabase import (
    get_course,
    create_quiz,
    create_quiz_questions,
    get_quiz,
    create_flashcard_deck,
    create_flashcards,
    get_flashcard_deck
)
from agents.quiz_gen_agent.agent import get_quiz_agent, Quiz, Deps as QuizDeps
from agents.flashcard_gen_agent.agent import get_flashcard_agent, Flashcard, Deps as FlashcardDeps


async def generate_quiz_from_chat(
    ctx: RunContext,
    num_questions: int = 5,
    difficulty: str = "medium",
    extra_context: str = "",
    quiz_name: str = ""
) -> str:
    """
    Generate a quiz based on the current file and chat context.
    
    Args:
        ctx: RunContext with chat dependencies
        num_questions: Number of quiz questions to generate (default 5)
        difficulty: Quiz difficulty level - easy, medium, or hard (default medium)
        extra_context: Additional context from chat conversation
        quiz_name: Custom name for the quiz (optional, defaults to "Chat Quiz - {course_name}")
    
    Returns:
        Formatted markdown response with quiz link and summary
    """
    try:
        # Ensure we have required dependencies
        if not ctx.deps.course_info:
            ctx.deps.course_info = await get_course(course_id=ctx.deps.course_id)
        
        # Convert chat deps to quiz deps
        # Chat agent uses single file_id, quiz agent expects file_ids list
        quiz_deps = QuizDeps(
            user_id=ctx.deps.user_id,
            course_id=ctx.deps.course_id,
            file_ids=[ctx.deps.file_id],  # Convert single file_id to list
            course_info=ctx.deps.course_info,
            files_info=[ctx.deps.file_info] if ctx.deps.file_info else None,  # Pass existing file_info if available
            note_ids=[],  # No notes for chat-based generation
            notes_info=[]  # No notes for chat-based generation
        )
        
        # Create quiz generation agent with current file
        agent = get_quiz_agent(
            num_quizzes=num_questions,
            difficulty=difficulty,
            file_ids=[ctx.deps.file_id],
            note_ids=[]  # Only using file content for now
        )
        
        # Build generation prompt with context
        prompt = f"Generate {num_questions} {difficulty} difficulty quiz questions"
        if extra_context:
            prompt += f". Additional context: {extra_context}"
        
        # Generate quiz questions
        result = await agent.run(prompt, deps=quiz_deps)
        quiz_questions = result.output
        
        # Convert to dictionary format
        quiz_dicts = [quiz.to_dict() for quiz in quiz_questions]
        
        # Create quiz in database
        if quiz_name:
            final_quiz_name = f"Chat Quiz - {quiz_name}"
        else:
            final_quiz_name = f"Chat Quiz - {ctx.deps.course_info.get('name', 'Course')}"
        quiz_id = await create_quiz(
            user_id=ctx.deps.user_id,
            course_id=ctx.deps.course_id,
            name=final_quiz_name,
            file_ids=[ctx.deps.file_id],
            question_count=len(quiz_dicts),
            extra_context=extra_context,
            difficulty=difficulty,
            note_ids=[]
        )
        
        # Store quiz questions in database
        await create_quiz_questions(quiz_id, quiz_dicts)
        
        # Get frontend URL from environment
        frontend_url = os.getenv("NEXT_PUBLIC_API_BASE_URL", "https://app.incourse.com")
        quiz_url = f"{frontend_url}/courses/{ctx.deps.course_id}/quizzes/{quiz_id}"
        
        # Build response with quiz summary
        response = f"✅ I've created a {num_questions}-question {difficulty} quiz!\n\n"
        response += f"[View Quiz: {final_quiz_name}]({quiz_url})\n\n"
        
        # Add summary of question topics
        topics = []
        for i, quiz in enumerate(quiz_questions, 1):
            # Extract topic from question (first few words)
            topic = quiz.question.split('.')[0].split('?')[0].strip()
            if len(topic) > 50:
                topic = topic[:47] + "..."
            topics.append(f"- Question {i}: {topic}")
        
        if topics:
            response += "The quiz includes:\n"
            response += "\n".join(topics[:5])  # Show first 5 topics
            if len(topics) > 5:
                response += f"\n- ... and {len(topics) - 5} more questions"
        
        return response
        
    except Exception as e:
        return f"❌ Error generating quiz: {str(e)}"


async def generate_flashcard_from_chat(
    ctx: RunContext,
    num_flashcards: int = 10,
    card_type: str = "term-definition",
    extra_context: str = "",
    flashcard_name: str = ""
) -> str:
    """
    Generate flashcards based on the current file and chat context.
    
    Args:
        ctx: RunContext with chat dependencies
        num_flashcards: Number of flashcards to generate (default 10)
        card_type: Type of flashcards - term-definition or concept-explanation (default term-definition)
        extra_context: Additional context from chat conversation
        flashcard_name: Custom name for the flashcard deck (optional, defaults to "Chat Flashcards - {course_name}")
    
    Returns:
        Formatted markdown response with flashcard deck link and summary
    """
    try:
        # Ensure we have required dependencies
        if not ctx.deps.course_info:
            ctx.deps.course_info = await get_course(course_id=ctx.deps.course_id)
        
        # Convert chat deps to flashcard deps
        # Chat agent uses single file_id, flashcard agent expects file_ids list
        flashcard_deps = FlashcardDeps(
            user_id=ctx.deps.user_id,
            course_id=ctx.deps.course_id,
            file_ids=[ctx.deps.file_id],  # Convert single file_id to list
            course_info=ctx.deps.course_info,
            files_info=[ctx.deps.file_info] if ctx.deps.file_info else None,  # Pass existing file_info if available
            note_ids=[],  # No notes for chat-based generation
            notes_info=[]  # No notes for chat-based generation
        )
        
        # Create flashcard generation agent with current file
        agent = get_flashcard_agent(
            file_ids=[ctx.deps.file_id],
            note_ids=[]  # Only using file content for now
        )
        
        # Build generation prompt with context
        prompt = f"Generate {num_flashcards} {card_type} flashcards"
        if extra_context:
            prompt += f". Additional context: {extra_context}"
        
        # Generate flashcards
        result = await agent.run(prompt, deps=flashcard_deps)
        flashcards = result.output
        
        # Convert to dictionary format
        flashcard_dicts = [flashcard.to_dict() for flashcard in flashcards]
        
        # Create flashcard deck in database
        if flashcard_name:
            final_deck_name = f"Chat Flashcards - {flashcard_name}"
        else:
            final_deck_name = f"Chat Flashcards - {ctx.deps.course_info.get('name', 'Course')}"
        deck_id = await create_flashcard_deck(
            user_id=ctx.deps.user_id,
            course_id=ctx.deps.course_id,
            name=final_deck_name,
            file_ids=[ctx.deps.file_id],
            card_count=len(flashcard_dicts),
            extra_context=extra_context,
            card_type=card_type,
            note_ids=[]
        )
        
        # Store flashcards in database
        await create_flashcards(deck_id, flashcard_dicts)
        
        # Get frontend URL from environment
        frontend_url = os.getenv("NEXT_PUBLIC_API_BASE_URL", "https://app.incourse.com")
        deck_url = f"{frontend_url}/courses/{ctx.deps.course_id}/flashcards/{deck_id}"
        
        # Build response with flashcard summary
        response = f"✅ I've created {num_flashcards} {card_type} flashcards!\n\n"
        response += f"[View Flashcards: {final_deck_name}]({deck_url})\n\n"
        
        # Add summary of flashcard topics
        topics = []
        for i, flashcard in enumerate(flashcards, 1):
            # Extract topic from question (first few words)
            topic = flashcard.question.split('.')[0].split('?')[0].strip()
            if len(topic) > 50:
                topic = topic[:47] + "..."
            topics.append(f"- Card {i}: {topic}")
        
        if topics:
            response += "The flashcards include:\n"
            response += "\n".join(topics[:5])  # Show first 5 topics
            if len(topics) > 5:
                response += f"\n- ... and {len(topics) - 5} more cards"
                
        print(response)
        
        return response
        
    except Exception as e:
        print(f"❌ Error generating flashcards: {str(e)}")
        return f"❌ Error generating flashcards: {str(e)}"
