"""
Tests for the summary agent.
"""

import asyncio
from agents.summary_agent.agent import (
    summarize_conversation,
    summarize_conversation_incremental,
    SummaryResult
)


def test_basic_summary():
    """Test basic conversation summarization."""
    messages = [
        {
            "sender": "user",
            "content": "Can you explain Newton's First Law of Motion?"
        },
        {
            "sender": "assistant",
            "content": "Newton's First Law states that an object at rest stays at rest and an object in motion stays in motion with the same speed and direction unless acted upon by an external force. This is also known as the law of inertia."
        },
        {
            "sender": "user",
            "content": "What's an example of this in real life?"
        },
        {
            "sender": "assistant",
            "content": "A common example is a passenger in a car. When the car suddenly stops, your body continues moving forward due to inertia, which is why seatbelts are important - they provide the external force needed to stop your motion."
        }
    ]
    
    result = asyncio.run(summarize_conversation(
        messages=messages,
        additional_context="Physics course - Chapter on Classical Mechanics"
    ))
    
    assert isinstance(result, SummaryResult)
    assert len(result.summary) > 0
    assert "Newton" in result.summary or "inertia" in result.summary.lower()
    print(f"\n✓ Basic Summary Test Passed")
    print(f"Summary: {result.summary}")
    print(f"Main Topics: {result.main_topics}")
    print(f"Key Insights: {result.key_insights}")


def test_incremental_summary():
    """Test incremental summarization building on previous summary."""
    previous_summary = """
    Main Topics: Newton's First Law, Inertia
    Key Questions: Student asked about Newton's First Law and real-life examples
    Insights: Explained law of inertia and provided car/seatbelt example
    """
    
    new_messages = [
        {
            "sender": "user",
            "content": "What about Newton's Second Law?"
        },
        {
            "sender": "assistant",
            "content": "Newton's Second Law states that F = ma, where force equals mass times acceleration. This means heavier objects require more force to accelerate."
        }
    ]
    
    result = asyncio.run(summarize_conversation_incremental(
        new_messages=new_messages,
        previous_summary=previous_summary,
        message_count=6,
        additional_context="Physics course - Classical Mechanics"
    ))
    
    assert isinstance(result, SummaryResult)
    assert len(result.summary) > 0
    print(f"\n✓ Incremental Summary Test Passed")
    print(f"Updated Summary: {result.summary}")
    print(f"Main Topics: {result.main_topics}")


def test_complex_conversation():
    """Test summarization of a longer, more complex conversation."""
    messages = [
        {"sender": "user", "content": "What is photosynthesis?"},
        {"sender": "assistant", "content": "Photosynthesis is the process plants use to convert light energy into chemical energy (glucose) using carbon dioxide and water."},
        {"sender": "user", "content": "What's the chemical equation?"},
        {"sender": "assistant", "content": "6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂"},
        {"sender": "user", "content": "Where does this happen in the cell?"},
        {"sender": "assistant", "content": "Photosynthesis occurs in chloroplasts, specifically in the thylakoid membranes (light reactions) and stroma (Calvin cycle)."},
        {"sender": "user", "content": "I'm confused about the difference between light and dark reactions"},
        {"sender": "assistant", "content": "Light reactions require light and produce ATP and NADPH in the thylakoids. The Calvin cycle (dark reactions) doesn't require light directly and uses ATP and NADPH to produce glucose in the stroma."},
    ]
    
    result = asyncio.run(summarize_conversation(
        messages=messages,
        additional_context="Biology course - Cellular Biology chapter"
    ))
    
    assert isinstance(result, SummaryResult)
    assert len(result.main_topics) > 0
    assert len(result.key_insights) > 0
    print(f"\n✓ Complex Conversation Test Passed")
    print(f"Summary: {result.summary}")
    print(f"Main Topics: {result.main_topics}")
    print(f"Key Insights: {result.key_insights}")


if __name__ == "__main__":
    print("Running Summary Agent Tests...\n")
    print("=" * 60)
    
    try:
        test_basic_summary()
        test_incremental_summary()
        test_complex_conversation()
        print("\n" + "=" * 60)
        print("✅ All tests passed!")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

