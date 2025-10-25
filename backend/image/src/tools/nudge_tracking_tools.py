"""
Nudge tracking tools that extract parameters from RunContext and call core API functions.
These tools provide data for the nudge agent to generate personalized nudges.
"""

import asyncio
from datetime import datetime, timedelta, timezone
from pydantic_ai import RunContext
from typing import List, Dict, Optional

# Import core API functions
from api import supabase as supabase_api


async def get_user_quiz_status(ctx: RunContext) -> Dict:
    """
    Get user's quiz completion status - quizzes created but not taken, low scores.
    """
    user_id = ctx.deps.user_id
    
    # Get all quizzes for user
    quizzes = await supabase_api.get_user_quizzes(user_id)
    
    # Get quiz attempts for user  
    attempts = await supabase_api.get_user_quiz_attempts(user_id)
    
    # Find quizzes with no attempts or incomplete attempts
    incomplete_quizzes = []
    low_score_quizzes = []
    
    for quiz in quizzes:
        quiz_attempts = [a for a in attempts if a['quiz_id'] == quiz['id']]
        
        if not quiz_attempts:
            # No attempts
            days_since_created = (datetime.now(timezone.utc) - datetime.fromisoformat(quiz['created_at'].replace('Z', '+00:00'))).days
            incomplete_quizzes.append({
                'quiz_id': quiz['id'],
                'quiz_name': quiz['name'],
                'course_name': quiz.get('courses', {}).get('name', 'Unknown Course'),
                'created_at': quiz['created_at'],
                'days_since_created': days_since_created
            })
        else:
            # Check for low scores
            latest_attempt = max(quiz_attempts, key=lambda x: x['created_at'])
            if latest_attempt['score'] < 60:  # Less than 60%
                low_score_quizzes.append({
                    'quiz_id': quiz['id'],
                    'quiz_name': quiz['name'],
                    'course_name': quiz.get('courses', {}).get('name', 'Unknown Course'),
                    'score': latest_attempt['score'],
                    'attempt_date': latest_attempt['created_at']
                })
    
    return {
        'incomplete_quizzes': incomplete_quizzes,
        'low_score_quizzes': low_score_quizzes,
        'total_quizzes': len(quizzes),
        'completed_quizzes': len(quizzes) - len(incomplete_quizzes)
    }


async def get_flashcard_study_status(ctx: RunContext) -> Dict:
    """
    Get flashcard study status - decks with low completion or not studied recently.
    """
    user_id = ctx.deps.user_id
    
    # Get all flashcard decks for user
    decks = await supabase_api.get_user_flashcard_decks(user_id)
    
    # Get study analytics for each deck
    study_status = []
    for deck in decks:
        analytics = await supabase_api.get_flashcard_analytics(deck['id'])
        
        # Calculate study completion percentage
        total_cards = analytics.get('total_cards', 0)
        viewed_cards = analytics.get('viewed_cards', 0)
        completion_rate = (viewed_cards / total_cards * 100) if total_cards > 0 else 0
        
        # Check last study date
        last_studied = analytics.get('last_viewed_at')
        days_since_study = None
        if last_studied:
            days_since_study = (datetime.now(timezone.utc) - datetime.fromisoformat(last_studied.replace('Z', '+00:00'))).days
        
        study_status.append({
            'deck_id': deck['id'],
            'deck_name': deck['name'],
            'course_name': deck.get('courses', {}).get('name', 'Unknown Course'),
            'completion_rate': completion_rate,
            'days_since_study': days_since_study,
            'total_cards': total_cards,
            'viewed_cards': viewed_cards,
            'needs_attention': completion_rate < 50 or (days_since_study and days_since_study > 3)
        })
    
    return {
        'study_status': study_status,
        'decks_needing_attention': [d for d in study_status if d['needs_attention']]
    }


async def get_upcoming_deadlines(ctx: RunContext) -> Dict:
    """
    Get assignments due within the next 7 days.
    """
    user_id = ctx.deps.user_id
    
    # Get user's courses
    courses = await supabase_api.get_user_courses(user_id)
    course_ids = [c['id'] for c in courses]
    
    # Get assignments due in next 7 days
    upcoming_assignments = []
    for course_id in course_ids:
        assignments = await supabase_api.get_course_assignments(course_id)
        
        for assignment in assignments:
            if assignment['due_at']:
                due_date = datetime.fromisoformat(assignment['due_at'].replace('Z', '+00:00'))
                days_until_due = (due_date - datetime.now(timezone.utc)).days
                
                if 0 <= days_until_due <= 7:  # Due within 7 days
                    upcoming_assignments.append({
                        'assignment_id': assignment['id'],
                        'name': assignment['name'],
                        'course_name': assignment.get('courses', {}).get('name', 'Unknown Course'),
                        'due_at': assignment['due_at'],
                        'days_until_due': days_until_due,
                        'priority': 'urgent' if days_until_due <= 1 else 'soon'
                    })
    
    return {
        'upcoming_assignments': upcoming_assignments,
        'urgent_count': len([a for a in upcoming_assignments if a['priority'] == 'urgent']),
        'soon_count': len([a for a in upcoming_assignments if a['priority'] == 'soon'])
    }


async def get_study_patterns(ctx: RunContext) -> Dict:
    """
    Analyze user's study patterns and engagement.
    """
    user_id = ctx.deps.user_id
    
    # Get recent activities (last 30 days)
    activities = await supabase_api.get_recent_activities(user_id, limit=100)
    
    # Analyze study patterns
    study_days = set()
    total_study_time = 0
    activity_types = {}
    
    for activity in activities:
        activity_date = datetime.fromisoformat(activity['created_at'].replace('Z', '+00:00'))
        study_days.add(activity_date.date())
        
        # Count activity types
        activity_type = activity['activity_type']
        activity_types[activity_type] = activity_types.get(activity_type, 0) + 1
        
        # Estimate study time (this would need to be calculated from actual data)
        if activity_type in ['quiz_completion', 'flashcard_study', 'reading']:
            total_study_time += 30  # Assume 30 minutes per activity
    
    # Calculate engagement metrics
    days_since_last_activity = None
    if activities:
        last_activity = datetime.fromisoformat(activities[0]['created_at'].replace('Z', '+00:00'))
        days_since_last_activity = (datetime.now(timezone.utc) - last_activity).days
    
    return {
        'study_days_last_30': len(study_days),
        'total_study_time_hours': total_study_time / 60,
        'activity_breakdown': activity_types,
        'days_since_last_activity': days_since_last_activity,
        'engagement_level': 'high' if len(study_days) >= 15 else 'medium' if len(study_days) >= 8 else 'low'
    }


async def get_nudge_preferences(ctx: RunContext) -> Dict:
    """
    Get user's historical nudge interaction patterns to personalize future nudges.
    """
    user_id = ctx.deps.user_id
    
    # Get nudge interaction statistics
    stats = await supabase_api.get_nudge_interaction_stats(user_id)
    
    # Analyze preferences
    preferred_labels = []
    avoided_labels = []
    
    for label, interactions in stats.get('by_label', {}).items():
        total_interactions = sum(interactions.values())
        if total_interactions > 0:
            completion_rate = interactions.get('completed', 0) / total_interactions
            dismissal_rate = interactions.get('dismissed', 0) / total_interactions
            
            if completion_rate > 0.6:  # User completes this type often
                preferred_labels.append(label)
            elif dismissal_rate > 0.7:  # User dismisses this type often
                avoided_labels.append(label)
    
    return {
        'preferred_nudge_types': preferred_labels,
        'avoided_nudge_types': avoided_labels,
        'total_interactions': stats.get('total_interactions', 0),
        'interaction_breakdown': stats.get('by_type', {}),
        'label_preferences': stats.get('by_label', {})
    }
