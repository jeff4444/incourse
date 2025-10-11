#!/bin/bash

# InCourse AI Agents - API Test Script
# This script tests all the API endpoints using curl

API_BASE="http://localhost:8000"
API_KEY="test_key"
COURSE_ID="test_course"
FILE_IDS='["file1", "file2"]'

echo "🧪 Testing InCourse AI Agents API"
echo "=================================="
echo "API Base URL: $API_BASE"
echo ""

# Function to make API calls and display results
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    
    echo "🔍 Testing: $name"
    echo "Endpoint: $method $endpoint"
    
    if [ -n "$data" ]; then
        echo "Data: $data"
        response=$(curl -s -X "$method" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_BASE$endpoint")
    else
        response=$(curl -s -X "$method" "$API_BASE$endpoint")
    fi
    
    echo "Response:"
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    echo ""
    echo "----------------------------------------"
    echo ""
}

# Test 1: Health Check
test_endpoint "Health Check" "GET" "/health"

# Test 2: Root endpoint
test_endpoint "Root Endpoint" "GET" "/"

# Test 3: Agent Status
test_endpoint "Agent Status" "GET" "/agents/status"

# Test 4: Generate Flashcards
flashcard_data='{
    "api_key": "'$API_KEY'",
    "course_id": "'$COURSE_ID'",
    "file_ids": ["file1", "file2"],
    "prompt": "Generate 3 flashcards about basic physics concepts"
}'
test_endpoint "Generate Flashcards" "POST" "/generate-flashcards" "$flashcard_data"

# Test 5: Generate Quiz
quiz_data='{
    "api_key": "'$API_KEY'",
    "course_id": "'$COURSE_ID'",
    "file_ids": ["file1", "file2"],
    "prompt": "Generate 2 multiple choice questions about chemistry"
}'
test_endpoint "Generate Quiz" "POST" "/generate-quiz" "$quiz_data"

# Test 6: Generate Nudges
nudge_data='{
    "api_key": "'$API_KEY'"
}'
test_endpoint "Generate Nudges" "POST" "/generate-nudges" "$nudge_data"

# Test 7: Take Action
action_data='{
    "api_key": "'$API_KEY'",
    "user_input": "I want to study for my math exam tomorrow"
}'
test_endpoint "Take Action" "POST" "/take-action" "$action_data"

echo "✅ All tests completed!"
echo ""
echo "📚 To view interactive API documentation, visit:"
echo "   $API_BASE/docs"
echo ""
echo "📖 To view ReDoc documentation, visit:"
echo "   $API_BASE/redoc" 