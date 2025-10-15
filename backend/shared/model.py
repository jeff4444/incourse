"""
Shared model configuration for all agents.

This module provides a centralized function to get the Bedrock model instance
used across all agents, making it easy to change models or configuration.
"""

import os
from pydantic_ai.models.bedrock import BedrockConverseModel
from pydantic_ai.providers.bedrock import BedrockProvider
from pydantic_ai.models.google import GoogleModel
from pydantic_ai.providers.google import GoogleProvider
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.models.anthropic import AnthropicModel
from pydantic_ai.providers.anthropic import AnthropicProvider
from dotenv import load_dotenv

load_dotenv()

# Beckrock model configuration from environment variables
BEDROCK_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
BEDROCK_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
BEDROCK_DEFAULT_LOCATION = os.getenv("AWS_DEFAULT_REGION")
BEDROCK_MODEL_ARN = os.getenv("AWS_MODEL_ARN")

# Anthropic model configuration
ANTHROPIC_API_KEY = os.getenv("CLAUDE_API_KEY")

# Gemini model configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# OpenAI model configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

def get_model(model_type: str = "bedrock"):
    if model_type == "bedrock":
        return get_bedrock_model()
    elif model_type == "anthropic":
        return get_anthropic_model()
    elif model_type == "openai":
        return get_openai_model()
    elif model_type == "gemini":
        return get_gemini_model()
    else:
        raise ValueError(f"Model type {model_type} not supported")

def get_bedrock_model() -> BedrockConverseModel:
    """
    Get the configured Bedrock model instance.
    
    Returns:
        BedrockConverseModel: The configured model instance ready to use with agents.
    
    Raises:
        ValueError: If required environment variables are not set.
    """
    if not all([BEDROCK_ACCESS_KEY, BEDROCK_SECRET_KEY, BEDROCK_DEFAULT_LOCATION, BEDROCK_MODEL_ARN]):
        missing = []
        if not BEDROCK_ACCESS_KEY:
            missing.append("AWS_ACCESS_KEY_ID")
        if not BEDROCK_SECRET_KEY:
            missing.append("AWS_SECRET_ACCESS_KEY")
        if not BEDROCK_DEFAULT_LOCATION:
            missing.append("AWS_DEFAULT_REGION")
        if not BEDROCK_MODEL_ARN:
            missing.append("AWS_MODEL_ARN")
        raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
    
    return BedrockConverseModel(
        BEDROCK_MODEL_ARN,
        provider=BedrockProvider(
            region_name=BEDROCK_DEFAULT_LOCATION,
            aws_access_key_id=BEDROCK_ACCESS_KEY,
            aws_secret_access_key=BEDROCK_SECRET_KEY,
        ),
    )

def get_anthropic_model() -> AnthropicModel:
    """
    Get the configured Anthropic model instance.
    """
    if not ANTHROPIC_API_KEY:
        raise ValueError("Anthropic API key is not set")
    provider = AnthropicProvider(api_key=ANTHROPIC_API_KEY)
    return AnthropicModel('claude-4-5-sonnet-latest', provider=provider)

def get_openai_model() -> OpenAIChatModel:
    """
    Get the configured OpenAI model instance.
    """
    if not OPENAI_API_KEY:
        raise ValueError("OpenAI API key is not set")
    provider = OpenAIProvider(api_key=OPENAI_API_KEY)
    return OpenAIChatModel('gpt-4o', provider=provider)

def get_gemini_model() -> GoogleModel:
    """
    Get the configured Gemini model instance.
    """
    if not GEMINI_API_KEY:
        raise ValueError("Gemini API key is not set")
    provider = GoogleProvider(api_key=GEMINI_API_KEY)
    return GoogleModel('gemini-2.5-flash', provider=provider)