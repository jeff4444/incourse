"""
Shared model configuration for all agents.

This module provides a centralized function to get the model instance
used across all agents, making it easy to change models or configuration.
Uses lazy loading to avoid importing all providers at startup.
"""

import os
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

def get_model(model_type: str = "openai"):
    # Only import and initialize the specific model provider needed
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

def get_bedrock_model():
    """
    Get the configured Bedrock model instance.
    
    Returns:
        BedrockConverseModel: The configured model instance ready to use with agents.
    
    Raises:
        ValueError: If required environment variables are not set.
    """
    from pydantic_ai.models.bedrock import BedrockConverseModel
    from pydantic_ai.providers.bedrock import BedrockProvider
    
    # Check for required environment variables
    if not BEDROCK_MODEL_ARN:
        raise ValueError("Missing required environment variable: AWS_MODEL_ARN")
    
    # Determine region - use environment variable or default to us-east-1
    region = BEDROCK_DEFAULT_LOCATION or 'us-east-1'
    
    # Detect if we're running in Lambda vs local development
    # In Lambda, AWS_LAMBDA_FUNCTION_NAME is automatically set
    is_lambda = os.getenv('AWS_LAMBDA_FUNCTION_NAME') is not None
    
    if is_lambda:
        # Lambda environment - use IAM role credentials (no explicit keys needed)
        print(f"DEBUG: Using IAM role credentials (Lambda environment)")
        print(f"DEBUG: Region: {region}")
        print(f"DEBUG: Model ARN: {BEDROCK_MODEL_ARN}")
        
        # Try to get AWS credentials info for debugging
        try:
            import boto3
            sts = boto3.client('sts', region_name=region)
            identity = sts.get_caller_identity()
            print(f"DEBUG: AWS Identity: {identity}")
        except Exception as e:
            print(f"DEBUG: Could not get AWS identity: {e}")
        
        return BedrockConverseModel(
            BEDROCK_MODEL_ARN,
            provider=BedrockProvider(
                region_name=region,
            ),
        )
    else:
        # Local development - use explicit credentials if available
        if BEDROCK_ACCESS_KEY and BEDROCK_SECRET_KEY:
            print(f"DEBUG: Using explicit AWS credentials (local development)")
            print(f"DEBUG: Region: {region}")
            print(f"DEBUG: Model ARN: {BEDROCK_MODEL_ARN}")
            return BedrockConverseModel(
                BEDROCK_MODEL_ARN,
                provider=BedrockProvider(
                    region_name=region,
                    aws_access_key_id=BEDROCK_ACCESS_KEY,
                    aws_secret_access_key=BEDROCK_SECRET_KEY,
                ),
            )
        else:
            # Local development without explicit credentials - use default credential chain
            print(f"DEBUG: Using default credential chain (local development)")
            print(f"DEBUG: Region: {region}")
            print(f"DEBUG: Model ARN: {BEDROCK_MODEL_ARN}")
            return BedrockConverseModel(
                BEDROCK_MODEL_ARN,
                provider=BedrockProvider(
                    region_name=region,
                ),
            )

def get_anthropic_model():
    """
    Get the configured Anthropic model instance.
    """
    from pydantic_ai.models.anthropic import AnthropicModel
    from pydantic_ai.providers.anthropic import AnthropicProvider
    
    if not ANTHROPIC_API_KEY:
        raise ValueError("Anthropic API key is not set")
    provider = AnthropicProvider(api_key=ANTHROPIC_API_KEY)
    return AnthropicModel('claude-4-5-sonnet-latest', provider=provider)

def get_openai_model():
    """
    Get the configured OpenAI model instance.
    """
    from pydantic_ai.models.openai import OpenAIChatModel
    from pydantic_ai.providers.openai import OpenAIProvider
    
    if not OPENAI_API_KEY:
        raise ValueError("OpenAI API key is not set")
    provider = OpenAIProvider(api_key=OPENAI_API_KEY)
    return OpenAIChatModel('gpt-4o', provider=provider)

def get_gemini_model():
    """
    Get the configured Gemini model instance.
    """
    from pydantic_ai.models.google import GoogleModel
    from pydantic_ai.providers.google import GoogleProvider
    
    if not GEMINI_API_KEY:
        raise ValueError("Gemini API key is not set")
    provider = GoogleProvider(api_key=GEMINI_API_KEY)
    return GoogleModel('gemini-2.5-flash', provider=provider)